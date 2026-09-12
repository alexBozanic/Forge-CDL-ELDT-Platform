\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end $$;

insert into auth.users (id, email, email_confirmed_at) values
  ('30000000-0000-4000-8000-000000000001', 'invited@northstar.example.invalid', statement_timestamp()),
  ('30000000-0000-4000-8000-000000000002', 'wrong@northstar.example.invalid', statement_timestamp()),
  ('30000000-0000-4000-8000-000000000003', 'expired@northstar.example.invalid', statement_timestamp()),
  ('30000000-0000-4000-8000-000000000004', 'revoked@northstar.example.invalid', statement_timestamp()),
  ('30000000-0000-4000-8000-000000000005', 'blocked@northstar.example.invalid', statement_timestamp()),
  ('30000000-0000-4000-8000-000000000006', 'unverified@northstar.example.invalid', null);

-- Only the stored platform grant authorizes school creation.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true(public.create_organization(
  'Pine Valley Demo School', 'pine-valley-demo', 'office@pinevalley.example.invalid'
) is not null, 'platform administrator could not create a school');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$ begin
  perform public.create_organization('Escalated School', 'escalated-school', null);
  raise exception 'ASSERTION FAILED: school administrator created a school';
exception when insufficient_privilege then null;
end $$;

-- A school administrator creates only student invitations in their own school.
select pg_temp.assert_true(public.create_student_invitation(
  'aaaaaaaa-0000-4000-8000-000000000001',
  'invited@northstar.example.invalid', repeat('a', 64), statement_timestamp() + interval '7 days',
  'eeeeeeee-0000-4000-8000-000000000001'
) is not null, 'school administrator could not create a student invitation');
do $$ begin
  perform token_hash from public.invitations;
  raise exception 'ASSERTION FAILED: authenticated role could read invitation hashes';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.create_student_invitation(
    'aaaaaaaa-0000-4000-8000-000000000001',
    'cross@northstar.example.invalid', repeat('b', 64), statement_timestamp() + interval '7 days',
    'eeeeeeee-0000-4000-8000-000000000002'
  );
  raise exception 'ASSERTION FAILED: cross-school assignment was accepted';
exception when foreign_key_violation then null;
end $$;
reset role;

-- The token is bound to the authenticated user's normalized Auth email.
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
do $$ begin
  perform public.accept_student_invitation(repeat('a', 64));
  raise exception 'ASSERTION FAILED: wrong email accepted an invitation';
exception when insufficient_privilege then null;
end $$;
reset role;
select pg_temp.assert_true((select status = 'pending' from public.invitations where token_hash = repeat('a', 64)),
  'wrong-email attempt consumed invitation');

insert into public.invitations (organization_id, email, token_hash, expires_at, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'unverified@northstar.example.invalid', repeat('f', 64),
  statement_timestamp() + interval '7 days', '10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000006', true);
do $$ begin
  perform public.accept_student_invitation(repeat('f', 64));
  raise exception 'ASSERTION FAILED: unverified email accepted an invitation';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Expired and revoked invitations fail without creating authority.
insert into public.invitations (organization_id, email, token_hash, expires_at, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'expired@northstar.example.invalid', repeat('c', 64),
  statement_timestamp() - interval '1 hour', '10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
do $$ begin
  perform public.accept_student_invitation(repeat('c', 64));
  raise exception 'ASSERTION FAILED: expired invitation was accepted';
exception when invalid_parameter_value then null;
end $$;
reset role;

insert into public.invitations (id, organization_id, email, token_hash, expires_at, created_by)
values ('ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001',
  'revoked@northstar.example.invalid', repeat('d', 64), statement_timestamp() + interval '7 days',
  '10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.revoke_invitation('ffffffff-0000-4000-8000-000000000004');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000004', true);
do $$ begin
  perform public.accept_student_invitation(repeat('d', 64));
  raise exception 'ASSERTION FAILED: revoked invitation was accepted';
exception when object_not_in_prerequisite_state then null;
end $$;
reset role;

-- Valid acceptance atomically creates the membership, pinned enrollment,
-- transition event and audit event. The row lock/status check prevents replay.
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true(public.accept_student_invitation(repeat('a', 64)) =
  'aaaaaaaa-0000-4000-8000-000000000001', 'valid invitation acceptance failed');
do $$ begin
  perform public.accept_student_invitation(repeat('a', 64));
  raise exception 'ASSERTION FAILED: invitation replay succeeded';
exception when object_not_in_prerequisite_state then null;
end $$;
select pg_temp.assert_true((select count(*) = 1 from public.enrollments), 'student did not see one enrollment');
select pg_temp.assert_true((select course_version_id = 'dddddddd-0000-4000-8000-000000000001' from public.enrollments),
  'enrollment was not pinned to assignment version');
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.enrollment_events
  where enrollment_id = (select id from public.enrollments where student_user_id = '30000000-0000-4000-8000-000000000001')),
  'initial enrollment transition was not recorded');

-- Suspended memberships cannot be reactivated through invitations.
insert into public.organization_memberships (organization_id, user_id, role, status)
values ('aaaaaaaa-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000005', 'student', 'suspended');
insert into public.invitations (organization_id, email, token_hash, expires_at, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'blocked@northstar.example.invalid', repeat('e', 64),
  statement_timestamp() + interval '7 days', '10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000005', true);
do $$ begin
  perform public.accept_student_invitation(repeat('e', 64));
  raise exception 'ASSERTION FAILED: suspended member accepted invitation';
exception when insufficient_privilege then null;
end $$;
reset role;

-- School-admin enrollment is tenant-bound and idempotent.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true(public.create_student_enrollment(
  'aaaaaaaa-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'eeeeeeee-0000-4000-8000-000000000001'
) = public.create_student_enrollment(
  'aaaaaaaa-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'eeeeeeee-0000-4000-8000-000000000001'
), 'repeated enrollment was not idempotent');
do $$ begin
  perform public.create_student_enrollment(
    'aaaaaaaa-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'eeeeeeee-0000-4000-8000-000000000002'
  );
  raise exception 'ASSERTION FAILED: cross-school assignment was enrolled';
exception when foreign_key_violation then null;
end $$;
reset role;

-- Draft versions cannot become assignments, and composite keys reject enrollment
-- attempts that mix a student, assignment, or version across tenant boundaries.
insert into public.course_versions (id, course_id, version_number, status, manifest_hash)
values ('dddddddd-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000001', 2, 'draft', repeat('2', 64));
do $$ begin
  insert into public.course_assignments (organization_id, course_version_id, title, created_by)
  values ('aaaaaaaa-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000002',
    'Forbidden draft assignment', '00000000-0000-4000-8000-000000000001');
  raise exception 'ASSERTION FAILED: draft course version was assigned';
exception when check_violation then null;
end $$;
do $$ begin
  insert into public.enrollments (organization_id, student_user_id, assignment_id, course_version_id, enrolled_by)
  values ('aaaaaaaa-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
    'eeeeeeee-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001');
  raise exception 'ASSERTION FAILED: cross-school assignment enrollment succeeded';
exception when foreign_key_violation then null;
end $$;

-- Suspending an organization disables its otherwise-active memberships.
update public.organizations set status = 'suspended'
where id = 'bbbbbbbb-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true((select count(*) = 0 from public.organizations),
  'suspended school administrator retained tenant access');
do $$ begin
  perform public.create_student_invitation(
    'bbbbbbbb-0000-4000-8000-000000000002', 'blocked@redcanyon.example.invalid',
    repeat('9', 64), statement_timestamp() + interval '7 days', null
  );
  raise exception 'ASSERTION FAILED: suspended school created an invitation';
exception when insufficient_privilege then null;
end $$;
reset role;

rollback;
\echo 'Phase 2 authorization, invitation, and enrollment assertions passed.'

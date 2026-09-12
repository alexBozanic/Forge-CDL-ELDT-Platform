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
  ('30000000-0000-4000-8000-000000000006', 'unverified@northstar.example.invalid', null),
  ('30000000-0000-4000-8000-000000000007', 'first-admin@northstar.example.invalid', statement_timestamp()),
  ('30000000-0000-4000-8000-000000000008', 'former-admin@northstar.example.invalid', statement_timestamp()),
  ('30000000-0000-4000-8000-000000000009', 'issuer-target@northstar.example.invalid', statement_timestamp()),
  ('30000000-0000-4000-8000-000000000010', 'signup-only@example.invalid', statement_timestamp());

-- Only the stored platform grant authorizes school creation.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true(public.create_organization(
  'Pine Valley Demo School', 'pine-valley-demo', 'office@pinevalley.example.invalid'
) is not null, 'platform administrator could not create a school');
select pg_temp.assert_true(public.create_school_admin_invitation(
  'aaaaaaaa-0000-4000-8000-000000000001',
  'first-admin@northstar.example.invalid', repeat('6', 64),
  statement_timestamp() + interval '7 days'
) is not null, 'platform administrator could not invite a school administrator');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$ begin
  perform public.create_organization('Escalated School', 'escalated-school', null);
  raise exception 'ASSERTION FAILED: school administrator created a school';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.create_school_admin_invitation(
    'aaaaaaaa-0000-4000-8000-000000000001',
    'escalation@northstar.example.invalid', repeat('5', 64),
    statement_timestamp() + interval '7 days'
  );
  raise exception 'ASSERTION FAILED: school administrator invited another administrator';
exception when insufficient_privilege then null;
end $$;
select public.update_organization_settings(
  'aaaaaaaa-0000-4000-8000-000000000001',
  'Northstar Driving School — Updated Demo',
  'updated@northstar.example.invalid', '#153B5B', '#F0A202'
);
select pg_temp.assert_true((select name = 'Northstar Driving School — Updated Demo'
  from public.organizations where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'school administrator could not update own settings');
do $$ begin
  perform public.update_organization_settings(
    'bbbbbbbb-0000-4000-8000-000000000002',
    'Cross tenant update', 'cross@example.invalid', '#153B5B', '#F0A202'
  );
  raise exception 'ASSERTION FAILED: school administrator updated another school';
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
exception when foreign_key_violation or check_violation then null;
end $$;
reset role;

-- A confirmed invited user can become a school administrator but never a
-- platform administrator. Signup/Auth identity alone creates no membership.
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000007', true);
select pg_temp.assert_true(public.accept_student_invitation(repeat('6', 64)) =
  'aaaaaaaa-0000-4000-8000-000000000001', 'school administrator invitation failed');
select pg_temp.assert_true((select role = 'school_admin' from public.organization_memberships
  where user_id = '30000000-0000-4000-8000-000000000007'), 'school administrator role was not assigned');
select pg_temp.assert_true(not exists (select 1 from public.platform_administrators
  where user_id = '30000000-0000-4000-8000-000000000007'), 'school invitation granted platform authority');
reset role;
select pg_temp.assert_true(not exists (select 1 from public.organization_memberships
  where user_id = '30000000-0000-4000-8000-000000000010'), 'signup alone granted school membership');

-- The token is bound to the authenticated user's normalized Auth email.
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true(public.accept_student_invitation(repeat('a', 64)) is null,
  'wrong email accepted an invitation');
reset role;

-- An invitation loses authority if its issuing school administrator is removed.
insert into public.organization_memberships (organization_id, user_id, role, status)
values ('aaaaaaaa-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000008', 'school_admin', 'active');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000008', true);
select pg_temp.assert_true(public.create_student_invitation(
  'aaaaaaaa-0000-4000-8000-000000000001',
  'issuer-target@northstar.example.invalid', repeat('8', 64),
  statement_timestamp() + interval '7 days', null
) is not null, 'temporary school administrator could not invite');
reset role;
update public.organization_memberships set status = 'removed'
where organization_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  and user_id = '30000000-0000-4000-8000-000000000008';
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000009', true);
select pg_temp.assert_true(public.accept_student_invitation(repeat('8', 64)) is null,
  'invitation from a removed issuer was accepted');
reset role;
select pg_temp.assert_true(not exists (select 1 from public.organization_memberships
  where user_id = '30000000-0000-4000-8000-000000000009'),
  'removed issuer invitation created a membership');
select pg_temp.assert_true((select status = 'pending' from public.invitations
  where token_hash = repeat('8', 64)), 'removed issuer invitation was consumed');
select pg_temp.assert_true((select status = 'pending' from public.invitations where token_hash = repeat('a', 64)),
  'wrong-email attempt consumed invitation');

-- Authenticated guessing is limited per user without recording guessed tokens.
insert into public.invitations (organization_id, email, token_hash, expires_at, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'wrong@northstar.example.invalid', repeat('4', 64),
  statement_timestamp() + interval '7 days', '10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
do $$ begin
  for attempt in 1..9 loop
    perform public.accept_student_invitation(lpad(attempt::text, 64, '0'));
  end loop;
end $$;
select pg_temp.assert_true(public.accept_student_invitation(repeat('4', 64)) is null,
  'rate-limited user redeemed an invitation');
reset role;
select pg_temp.assert_true((select attempt_count = 11
  from private.invitation_redemption_limits
  where user_id = '30000000-0000-4000-8000-000000000002'), 'redemption attempts were not rate limited');
select pg_temp.assert_true((select status = 'pending' from public.invitations
  where token_hash = repeat('4', 64)), 'rate limiting consumed an invitation');

insert into public.invitations (organization_id, email, token_hash, expires_at, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'unverified@northstar.example.invalid', repeat('f', 64),
  statement_timestamp() + interval '7 days', '10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000006', true);
select pg_temp.assert_true(public.accept_student_invitation(repeat('f', 64)) is null,
  'unverified email accepted an invitation');
reset role;

-- Expired and revoked invitations fail without creating authority.
insert into public.invitations (organization_id, email, token_hash, expires_at, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'expired@northstar.example.invalid', repeat('c', 64),
  statement_timestamp() - interval '1 hour', '10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select pg_temp.assert_true(public.accept_student_invitation(repeat('c', 64)) is null,
  'expired invitation was accepted');
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
select pg_temp.assert_true(public.accept_student_invitation(repeat('d', 64)) is null,
  'revoked invitation was accepted');
reset role;

-- Valid acceptance atomically creates the membership, pinned enrollment,
-- transition event and audit event. The row lock/status check prevents replay.
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true(public.accept_student_invitation(repeat('a', 64)) =
  'aaaaaaaa-0000-4000-8000-000000000001', 'valid invitation acceptance failed');
select pg_temp.assert_true(public.accept_student_invitation(repeat('a', 64)) is null,
  'invitation replay succeeded');
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
select pg_temp.assert_true(public.accept_student_invitation(repeat('e', 64)) is null,
  'suspended member accepted invitation');
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
insert into public.course_versions (
  id, course_id, version_number, status, manifest_hash, title, description, created_by
)
values (
  'dddddddd-0000-4000-8000-000000000002',
  'cccccccc-0000-4000-8000-000000000001', 2, 'draft', repeat('2', 64),
  'Draft boundary fixture', 'Not published.', '00000000-0000-4000-8000-000000000001'
);
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
exception when foreign_key_violation or check_violation then null;
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

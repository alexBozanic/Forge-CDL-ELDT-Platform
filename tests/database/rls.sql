\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end $$;

-- Set up lifecycle cases as the database owner. Profiles are created only while
-- the corresponding fake student membership is active, then access is revoked.
insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000004', 'suspended@northstar.example.invalid'),
  ('10000000-0000-4000-8000-000000000005', 'removed@northstar.example.invalid');
insert into public.organization_memberships (organization_id, user_id, role, status)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'student', 'active'),
  ('aaaaaaaa-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'student', 'active');
insert into public.student_profiles (organization_id, user_id, legal_first_name, legal_last_name)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'Suspended', 'Example'),
  ('aaaaaaaa-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'Removed', 'Example');
update public.organization_memberships set status = 'suspended'
where user_id = '10000000-0000-4000-8000-000000000004';
update public.organization_memberships set status = 'removed'
where user_id = '10000000-0000-4000-8000-000000000005';

-- Anonymous users receive neither table grants nor permissive policies.
set local role anon;
do $$ begin
  perform * from public.organizations;
  raise exception 'ASSERTION FAILED: anonymous organization read was allowed';
exception when insufficient_privilege then null;
end $$;

reset role;

-- Northstar administrator sees all members/profiles in Northstar and none in Red Canyon.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true((select count(*) = 1 from public.organizations), 'school admin must see one organization');
select pg_temp.assert_true((select count(*) = 5 from public.organization_memberships), 'school admin must see own-school memberships');
select pg_temp.assert_true((select count(*) = 4 from public.student_profiles), 'school admin must see own-school students');
select pg_temp.assert_true(not exists (
  select 1 from public.student_profiles where organization_id = 'bbbbbbbb-0000-4000-8000-000000000002'
), 'school admin read leaked another school');

-- A school administrator cannot write across schools or grant platform access.
do $$
declare changed integer;
begin
  update public.student_profiles set legal_first_name = 'Cross-school write'
  where organization_id = 'bbbbbbbb-0000-4000-8000-000000000002';
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'ASSERTION FAILED: school admin changed another school profile';
  end if;
end $$;
do $$ begin
  insert into public.platform_administrators (user_id, granted_by)
  values (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  );
  raise exception 'ASSERTION FAILED: school admin escalated to platform administrator';
exception when insufficient_privilege then null;
end $$;

do $$ begin
  insert into public.organization_memberships (organization_id, user_id, role)
  values ('aaaaaaaa-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'school_admin');
  raise exception 'ASSERTION FAILED: application user granted a role';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Suspended and removed memberships do not authorize tenant data reads or writes.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select pg_temp.assert_true((select count(*) = 0 from public.organizations), 'suspended student saw an organization');
select pg_temp.assert_true((select count(*) = 0 from public.student_profiles), 'suspended student saw a profile');
update public.student_profiles set legal_first_name = 'Suspended write';
select pg_temp.assert_true(not exists (
  select 1 from public.student_profiles where legal_first_name = 'Suspended write'
), 'suspended student changed a profile');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select pg_temp.assert_true((select count(*) = 0 from public.organizations), 'removed student saw an organization');
select pg_temp.assert_true((select count(*) = 0 from public.student_profiles), 'removed student saw a profile');
update public.student_profiles set legal_first_name = 'Removed write';
select pg_temp.assert_true(not exists (
  select 1 from public.student_profiles where legal_first_name = 'Removed write'
), 'removed student changed a profile');
reset role;

-- A student sees only their own profile and cannot write another student's record.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true((select count(*) = 1 from public.student_profiles), 'student must see one profile');
select pg_temp.assert_true((select user_id = '10000000-0000-4000-8000-000000000002' from public.student_profiles), 'student saw the wrong profile');

do $$
declare changed integer;
begin
  update public.student_profiles set legal_first_name = 'Forbidden'
  where user_id = '10000000-0000-4000-8000-000000000003';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'ASSERTION FAILED: student changed another profile'; end if;
end $$;

update public.student_profiles set legal_first_name = 'Avery Updated'
where user_id = '10000000-0000-4000-8000-000000000002';
select pg_temp.assert_true((select legal_first_name = 'Avery Updated' from public.student_profiles), 'student own-profile update failed');

do $$ begin
  update public.audit_events set action = 'tampered';
  raise exception 'ASSERTION FAILED: audit update was allowed';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  delete from public.audit_events;
  raise exception 'ASSERTION FAILED: audit delete was allowed';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Even a database-owner operation cannot create a cross-tenant profile relationship.
do $$ begin
  insert into public.student_profiles (
    organization_id, user_id, legal_first_name, legal_last_name
  ) values (
    'aaaaaaaa-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'Cross', 'Tenant'
  );
  raise exception 'ASSERTION FAILED: cross-tenant foreign key was allowed';
exception when foreign_key_violation or check_violation then null;
end $$;

rollback;
\echo 'Database RLS and constraint integration assertions passed.'

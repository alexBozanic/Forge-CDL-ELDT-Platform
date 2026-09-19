\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_true(value boolean, message text) returns void language plpgsql as $$
begin if value is not true then raise exception 'ASSERTION FAILED: %',message; end if; end $$;
-- Remove one fake current profile to exercise first-time creation.
delete from public.student_profiles where user_id='10000000-0000-4000-8000-000000000002';
set local role anon;
do $$ begin
 perform public.save_student_profile('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','A',null,'B',null,null,null);
 raise exception 'anonymous save allowed';
exception when insufficient_privilege then null; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.save_student_profile('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',' Avery ',null,' Example ','1990-01-01',' DEMO-ONLY ','co');
select pg_temp.assert_true((select legal_first_name='Avery' and issuing_jurisdiction='CO' from public.student_profiles where user_id=auth.uid()),'self create normalizes fields');
do $$ begin
 perform public.save_student_profile('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','A',null,'B',null,null,null);
 raise exception 'peer save allowed';
exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.save_student_profile('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Updated',null,'Example',null,null,null);
do $$ begin
 perform public.save_student_profile('bbbbbbbb-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','A',null,'B',null,null,null);
 raise exception 'cross-school save allowed';
exception when insufficient_privilege then null; end $$;
do $$ begin
 perform public.save_student_profile('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',' ',null,'B',null,null,null);
 raise exception 'blank name allowed';
exception when invalid_parameter_value then null; end $$;
do $$ begin
 perform public.save_student_profile('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','A',null,'B',current_date+1,null,null);
 raise exception 'future birthday allowed';
exception when invalid_parameter_value then null; end $$;
reset role;
select pg_temp.assert_true((select legal_first_name='Updated' from public.student_profiles where user_id='10000000-0000-4000-8000-000000000002'),'school admin update');
select pg_temp.assert_true((select count(*)=2 from public.audit_events where action='student.profile_saved'),'profile changes audited');
update public.organization_memberships set status='suspended' where user_id='10000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
 perform public.save_student_profile('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','A',null,'B',null,null,null);
 raise exception 'suspended save allowed';
exception when insufficient_privilege then null; end $$;
reset role;
-- Platform administrators can repair an active student's current profile.
update public.organization_memberships set status='active' where user_id='10000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.save_student_profile('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Platform edited',null,'Example',null,null,null);
do $$ begin
 perform public.save_student_profile('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','A',null,'B',null,null,null);
 raise exception 'non-student target allowed';
exception when insufficient_privilege then null; end $$;
reset role;
update public.organizations set status='suspended' where id='aaaaaaaa-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 perform public.save_student_profile('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','A',null,'B',null,null,null);
 raise exception 'suspended school save allowed';
exception when insufficient_privilege then null; end $$;
reset role;
rollback;

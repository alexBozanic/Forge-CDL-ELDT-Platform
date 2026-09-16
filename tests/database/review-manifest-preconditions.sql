\set ON_ERROR_STOP on
begin;
create or replace function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$ begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end $$;

select pg_temp.assert_true(not has_function_privilege('authenticated',
  'public.review_course_version(uuid,public.curriculum_review_decision,text)', 'execute'), 'legacy review bypass remains callable');
select pg_temp.assert_true(not has_function_privilege('authenticated',
  'public.publish_course_version(uuid)', 'execute'), 'legacy publication bypass remains callable');
select pg_temp.assert_true(not has_function_privilege('anon',
  'public.review_course_version_at_hash(uuid,text,public.curriculum_review_decision,text)', 'execute'), 'anonymous review grant');
select pg_temp.assert_true(not has_function_privilege('anon',
  'public.publish_course_version_at_hash(uuid,text)', 'execute'), 'anonymous publication grant');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select public.create_course('Stale editor regression fixture', 'Fake review test only.', true) as course_id \gset
select public.create_course_version(:'course_id') as version_id \gset
select public.add_course_module(:'version_id', 'Fake module', 1) as module_id \gset
select public.add_course_lesson(:'version_id', :'module_id', 'Original fake lesson', 'Original fake content.', 1, 1);
select set_config('forge.test_version', :'version_id', true);
select set_config('forge.test_hash', (select manifest_hash from public.course_versions where id = :'version_id'), true);
select public.add_course_lesson(:'version_id', :'module_id', 'Changed fake lesson', 'Content added after the editor opened.', 2, 1);

do $$ begin
  perform public.review_course_version_at_hash(current_setting('forge.test_version')::uuid,
    current_setting('forge.test_hash'), 'approved', 'Stale editor must not approve changed content.');
  raise exception 'ASSERTION FAILED: stale editor approved changed content';
exception when serialization_failure then null; end $$;
select pg_temp.assert_true((select count(*) = 0 from public.curriculum_reviews where course_version_id = :'version_id'), 'stale review wrote history');
do $$ begin
  perform public.review_course_version_at_hash(current_setting('forge.test_version')::uuid,
    null, 'approved', 'Missing hash must fail.');
  raise exception 'ASSERTION FAILED: missing hash accepted';
exception when invalid_parameter_value then null; end $$;

select public.review_course_version_at_hash(:'version_id',
  (select manifest_hash from public.course_versions where id = :'version_id'),
  'approved', 'Current exact-hash fake review; no curriculum approval claim.');
do $$ begin
  perform public.publish_course_version_at_hash(current_setting('forge.test_version')::uuid,
    current_setting('forge.test_hash'));
  raise exception 'ASSERTION FAILED: stale editor published a different reviewed manifest';
exception when serialization_failure then null; end $$;
select pg_temp.assert_true((select status = 'draft' from public.course_versions where id = :'version_id'), 'stale publication changed status');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$ begin
  perform public.review_course_version_at_hash(current_setting('forge.test_version')::uuid,
    current_setting('forge.test_hash'), 'approved', 'School admin must fail.');
  raise exception 'ASSERTION FAILED: school admin reviewed curriculum';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.publish_course_version_at_hash(current_setting('forge.test_version')::uuid,
    current_setting('forge.test_hash'));
  raise exception 'ASSERTION FAILED: school admin published curriculum';
exception when insufficient_privilege then null; end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select public.publish_course_version_at_hash(:'version_id',
  (select manifest_hash from public.course_versions where id = :'version_id')) as published_hash \gset
select pg_temp.assert_true((select status = 'published' and manifest_hash = :'published_hash'
  from public.course_versions where id = :'version_id'), 'current hash publication failed');
select pg_temp.assert_true((select count(*) = 1 from public.curriculum_reviews where course_version_id = :'version_id'
  and manifest_hash = :'published_hash'), 'review did not retain exact published hash');
reset role;
rollback;

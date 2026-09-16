begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$ begin
  if condition is not true then raise exception 'assertion failed: %', message; end if;
end $$;

-- Build the same fake completion fixture used by the assessment suite, which rolls back.
insert into public.course_versions(id,course_id,version_number,status,manifest_hash,title,description,created_by)
values('e6000000-0000-4000-8000-000000000001','cccccccc-0000-4000-8000-000000000001',2,'draft',repeat('0',64),'Transcript demo revision','Fake test material only.','00000000-0000-4000-8000-000000000001');
insert into public.course_modules(id,course_version_id,title,position)
values('e6100000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001','Demo module',1);
insert into public.course_lessons(id,course_version_id,module_id,title,body_markdown,position,estimated_minutes)
values('e6200000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001','e6100000-0000-4000-8000-000000000001','Demo transcript lesson','Fake lesson.',1,1);
insert into public.assessments(id,course_version_id,kind,title,position,question_count,passing_percent,time_limit_minutes)
values('e6300000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001','final_exam','Demo transcript final',1,1,80,30);
insert into public.assessment_blueprint_topics(course_version_id,assessment_id,topic_code,required_count)
values('e6000000-0000-4000-8000-000000000001','e6300000-0000-4000-8000-000000000001','safe_demo',1);
insert into public.assessment_questions(id,course_version_id,assessment_id,topic_code,prompt)
values('e6400000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001','e6300000-0000-4000-8000-000000000001','safe_demo','Fake question');
insert into public.assessment_options(id,course_version_id,question_id,option_text) values
('e6500000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001','e6400000-0000-4000-8000-000000000001','Wrong'),
('e6600000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001','e6400000-0000-4000-8000-000000000001','Right');
insert into private.assessment_answer_keys(course_version_id,question_id,correct_option_id)
values('e6000000-0000-4000-8000-000000000001','e6400000-0000-4000-8000-000000000001','e6600000-0000-4000-8000-000000000001');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.review_course_version('e6000000-0000-4000-8000-000000000001','approved','Fake transcript review.');
select public.publish_course_version('e6000000-0000-4000-8000-000000000001');
reset role;
insert into public.course_assignments(id,organization_id,course_version_id,title,created_by) values
('e6700000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001','Transcript demo assignment','10000000-0000-4000-8000-000000000001');
insert into public.enrollments(id,organization_id,student_user_id,assignment_id,course_version_id,enrolled_by) values
('e6800000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','e6700000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');

set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.record_lesson_interaction('e6800000-0000-4000-8000-000000000001','e6200000-0000-4000-8000-000000000001','completed',0,'e6900000-0000-4000-8000-000000000001');
select (public.start_assessment('e6800000-0000-4000-8000-000000000001','e6300000-0000-4000-8000-000000000001','e6900000-0000-4000-8000-000000000002')->>'attempt_id')::uuid as attempt_id \gset
select public.submit_assessment(:'attempt_id',jsonb_build_object('e6400000-0000-4000-8000-000000000001','e6600000-0000-4000-8000-000000000001'));
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select (select id from public.course_completions where enrollment_id='e6800000-0000-4000-8000-000000000001') as completion_id \gset
select pg_temp.assert_true(public.get_training_transcript(:'completion_id')->'course'->>'version_id'='e6000000-0000-4000-8000-000000000001','transcript did not retain pinned version');
select pg_temp.assert_true(jsonb_array_length(public.get_training_transcript(:'completion_id')->'lessons')=1,'transcript omitted manifest lessons');
select pg_temp.assert_true((public.get_training_transcript(:'completion_id')->'lessons'->0->>'completed_at') is not null,'transcript omitted lesson completion timestamp');
select pg_temp.assert_true(jsonb_array_length(public.get_training_transcript(:'completion_id')->'attempts')=1,'transcript omitted attempts');
select pg_temp.assert_true((public.get_training_transcript(:'completion_id')->'attempts'->0->>'score_percent')::integer=100,'transcript score is wrong');
select public.save_student_profile('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Changed',null,'Example',null,null,null);
select pg_temp.assert_true(public.get_training_transcript(:'completion_id')->'completion'->'student_identity_snapshot'->>'legal_first_name'='Avery','transcript did not use immutable identity snapshot');
do $$ begin begin perform count(*) from public.assessment_answers; raise exception 'administrator read submitted answers'; exception when insufficient_privilege then null; end; end $$;
reset role;

-- A foreign tenant and a revoked school administrator receive no transcript.
set role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
do $$ begin
  begin perform public.get_training_transcript('00000000-0000-0000-0000-000000000000'); raise exception 'missing transcript leaked'; exception when insufficient_privilege then null; end;
  begin perform public.get_training_transcript((select id from public.course_completions where enrollment_id='e6800000-0000-4000-8000-000000000001')); raise exception 'foreign transcript leaked'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.organization_memberships set status='removed' where organization_id='aaaaaaaa-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ begin begin perform public.get_training_transcript((select id from public.course_completions where enrollment_id='e6800000-0000-4000-8000-000000000001')); raise exception 'revoked administrator read transcript'; exception when insufficient_privilege then null; end; end $$;
reset role;

rollback;
\echo 'Tenant-authorized printable transcript assertions passed.'

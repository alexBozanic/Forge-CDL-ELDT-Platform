begin;
create or replace function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$ begin if not coalesce(ok,false) then raise exception 'assertion failed: %',message; end if; end $$;
create or replace function pg_temp.expect_invalid_submission(attempt_id uuid, answers jsonb) returns void language plpgsql as $$ begin begin perform public.submit_assessment(attempt_id,answers); raise exception 'invalid assessment submission was accepted'; exception when sqlstate '22023' then null; end; end $$;

-- A new version carries assessment content; the already-published seed version remains untouched.
insert into public.course_versions(id,course_id,version_number,status,manifest_hash,title,description,created_by)
values('d6000000-0000-4000-8000-000000000001','cccccccc-0000-4000-8000-000000000001',2,'draft',repeat('0',64),'Assessment demo revision','Fake test material only.','00000000-0000-4000-8000-000000000001');
insert into public.course_modules(id,course_version_id,title,position) values('d6100000-0000-4000-8000-000000000001','d6000000-0000-4000-8000-000000000001','Demo prerequisite',1);
insert into public.course_lessons(id,course_version_id,module_id,title,body_markdown,position,estimated_minutes)
values('d6200000-0000-4000-8000-000000000001','d6000000-0000-4000-8000-000000000001','d6100000-0000-4000-8000-000000000001','Demo prerequisite lesson','Original fake test lesson; not approved training.',1,1);
insert into public.assessments(id,course_version_id,kind,title,position,question_count,passing_percent,time_limit_minutes)
values('d6300000-0000-4000-8000-000000000001','d6000000-0000-4000-8000-000000000001','final_exam','Demo final',1,5,80,30);
insert into public.assessment_blueprint_topics(course_version_id,assessment_id,topic_code,required_count)
values('d6000000-0000-4000-8000-000000000001','d6300000-0000-4000-8000-000000000001','safe_demo',5);

-- Five deterministic questions, each with two options and a private key.
do $$ declare q integer; qid uuid; wrong_id uuid; right_id uuid; begin
 for q in 1..5 loop
  qid := ('d64'||lpad(q::text,1,'0')||'0000-0000-4000-8000-000000000001')::uuid;
  wrong_id := ('d65'||lpad(q::text,1,'0')||'0000-0000-4000-8000-000000000001')::uuid;
  right_id := ('d66'||lpad(q::text,1,'0')||'0000-0000-4000-8000-000000000001')::uuid;
  insert into public.assessment_questions(id,course_version_id,assessment_id,topic_code,prompt)
   values(qid,'d6000000-0000-4000-8000-000000000001','d6300000-0000-4000-8000-000000000001','safe_demo','Demo question '||q);
  insert into public.assessment_options(id,course_version_id,question_id,option_text) values
   (wrong_id,'d6000000-0000-4000-8000-000000000001',qid,'Incorrect demo option'),
   (right_id,'d6000000-0000-4000-8000-000000000001',qid,'Correct demo option');
  insert into private.assessment_answer_keys(course_version_id,question_id,correct_option_id)
   values('d6000000-0000-4000-8000-000000000001',qid,right_id);
 end loop;
end $$;

select manifest_hash as hash_before_key_change from public.course_versions where id='d6000000-0000-4000-8000-000000000001' \gset
update private.assessment_answer_keys set correct_option_id='d6510000-0000-4000-8000-000000000001'
where course_version_id='d6000000-0000-4000-8000-000000000001' and question_id='d6410000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select manifest_hash<>:'hash_before_key_change' from public.course_versions where id='d6000000-0000-4000-8000-000000000001'),'answer-key change did not rotate private manifest hash');
update private.assessment_answer_keys set correct_option_id='d6610000-0000-4000-8000-000000000001'
where course_version_id='d6000000-0000-4000-8000-000000000001' and question_id='d6410000-0000-4000-8000-000000000001';

set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.review_course_version('d6000000-0000-4000-8000-000000000001','approved','Software test review only; no approval claim.');
select public.publish_course_version('d6000000-0000-4000-8000-000000000001');
reset role;
select pg_temp.assert_true((select manifest_hash from public.course_versions where id='d6000000-0000-4000-8000-000000000001') <> (select manifest_hash from public.course_versions where id='dddddddd-0000-4000-8000-000000000001'),'revision overwrote historical manifest');

do $$ begin begin update public.assessment_questions set prompt='tamper' where id='d6410000-0000-4000-8000-000000000001'; raise exception 'published question changed'; exception when sqlstate '55000' then null; end; begin delete from private.assessment_answer_keys where question_id='d6410000-0000-4000-8000-000000000001'; raise exception 'published key deleted'; exception when sqlstate '55000' then null; end; end $$;

insert into public.course_assignments(id,organization_id,course_version_id,title,created_by) values
('d6700000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','d6000000-0000-4000-8000-000000000001','Assessment demo assignment','10000000-0000-4000-8000-000000000001');
insert into public.enrollments(id,organization_id,student_user_id,assignment_id,course_version_id,enrolled_by) values
('d6800000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','d6700000-0000-4000-8000-000000000001','d6000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');

-- Final is locked until every manifest lesson has a completion interaction.
set role authenticated; select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin begin perform public.start_assessment('d6800000-0000-4000-8000-000000000001','d6300000-0000-4000-8000-000000000001','d6900000-0000-4000-8000-000000000001'); raise exception 'final opened before prerequisites'; exception when sqlstate '55000' then null; end; end $$;
select public.record_lesson_interaction('d6800000-0000-4000-8000-000000000001','d6200000-0000-4000-8000-000000000001','completed',0,'d6900000-0000-4000-8000-000000000002');
select (public.start_assessment('d6800000-0000-4000-8000-000000000001','d6300000-0000-4000-8000-000000000001','d6900000-0000-4000-8000-000000000003')->>'attempt_id')::uuid as first_attempt \gset
select public.start_assessment('d6800000-0000-4000-8000-000000000001','d6300000-0000-4000-8000-000000000001','d6900000-0000-4000-8000-000000000003')->'questions' as replayed_questions \gset
reset role;
select pg_temp.assert_true((select jsonb_array_length(selected_questions)=5 from private.assessment_attempt_payloads where attempt_id=:'first_attempt'),'blueprint did not select exact question count');
select pg_temp.assert_true((select selected_questions=:'replayed_questions'::jsonb from private.assessment_attempt_payloads where attempt_id=:'first_attempt'),'idempotent start did not preserve randomized question and option order');
set role authenticated; select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
-- A same-version option for a different question and an unselected question are rejected atomically.
select pg_temp.expect_invalid_submission(:'first_attempt',jsonb_build_object(
   'd6410000-0000-4000-8000-000000000001','d6620000-0000-4000-8000-000000000001',
   'd6420000-0000-4000-8000-000000000001','d6620000-0000-4000-8000-000000000001',
   'd6430000-0000-4000-8000-000000000001','d6630000-0000-4000-8000-000000000001',
   'd6440000-0000-4000-8000-000000000001','d6640000-0000-4000-8000-000000000001',
   'd6450000-0000-4000-8000-000000000001','d6650000-0000-4000-8000-000000000001'));
select pg_temp.expect_invalid_submission(:'first_attempt',jsonb_build_object(
   '00000000-0000-4000-8000-000000000001','d6610000-0000-4000-8000-000000000001',
   'd6420000-0000-4000-8000-000000000001','d6620000-0000-4000-8000-000000000001',
   'd6430000-0000-4000-8000-000000000001','d6630000-0000-4000-8000-000000000001',
   'd6440000-0000-4000-8000-000000000001','d6640000-0000-4000-8000-000000000001',
   'd6450000-0000-4000-8000-000000000001','d6650000-0000-4000-8000-000000000001'));
select pg_temp.assert_true(not exists(select 1 from public.assessment_answers where attempt_id=:'first_attempt'),'invalid answers were partially persisted');
-- 3/5 = 60, below the exact 80 threshold.
select public.submit_assessment(:'first_attempt',jsonb_build_object(
'd6410000-0000-4000-8000-000000000001','d6610000-0000-4000-8000-000000000001',
'd6420000-0000-4000-8000-000000000001','d6620000-0000-4000-8000-000000000001',
'd6430000-0000-4000-8000-000000000001','d6630000-0000-4000-8000-000000000001',
'd6440000-0000-4000-8000-000000000001','d6540000-0000-4000-8000-000000000001',
'd6450000-0000-4000-8000-000000000001','d6550000-0000-4000-8000-000000000001'));
select pg_temp.assert_true((select status='failed' and score_percent=60 from public.assessment_attempts where id=:'first_attempt'),'below-threshold score was wrong');
select pg_temp.assert_true(public.submit_assessment(:'first_attempt','{}'::jsonb)->>'status'='failed','submitted-attempt replay changed the result');
select pg_temp.assert_true(public.get_assessment_attempt(:'first_attempt')->'questions'='null'::jsonb,'submitted final payload remained student-readable');
select pg_temp.assert_true(not exists(select 1 from public.course_completions where enrollment_id='d6800000-0000-4000-8000-000000000001'),'failed attempt completed enrollment');
-- Retake at exactly 4/5 = 80 passes and creates one completion/needs-attention record.
select (public.start_assessment('d6800000-0000-4000-8000-000000000001','d6300000-0000-4000-8000-000000000001','d6900000-0000-4000-8000-000000000004')->>'attempt_id')::uuid as pass_attempt \gset
select public.submit_assessment(:'pass_attempt',jsonb_build_object(
'd6410000-0000-4000-8000-000000000001','d6610000-0000-4000-8000-000000000001',
'd6420000-0000-4000-8000-000000000001','d6620000-0000-4000-8000-000000000001',
'd6430000-0000-4000-8000-000000000001','d6630000-0000-4000-8000-000000000001',
'd6440000-0000-4000-8000-000000000001','d6640000-0000-4000-8000-000000000001',
'd6450000-0000-4000-8000-000000000001','d6550000-0000-4000-8000-000000000001'));
select pg_temp.assert_true((select status='passed' and score_percent=80 from public.assessment_attempts where id=:'pass_attempt'),'boundary score did not pass');
select pg_temp.assert_true((select count(*)=1 from public.course_completions where enrollment_id='d6800000-0000-4000-8000-000000000001'),'completion was not idempotently created');
select pg_temp.assert_true((select not reporting_ready and readiness_issues ? 'missing_provider_identifier' from public.course_completions where enrollment_id='d6800000-0000-4000-8000-000000000001'),'missing reporting fields did not block readiness');
-- A post-completion retake above the threshold is retained without duplicating completion.
select (public.start_assessment('d6800000-0000-4000-8000-000000000001','d6300000-0000-4000-8000-000000000001','d6900000-0000-4000-8000-000000000005')->>'attempt_id')::uuid as high_attempt \gset
select public.submit_assessment(:'high_attempt',jsonb_build_object(
'd6410000-0000-4000-8000-000000000001','d6610000-0000-4000-8000-000000000001',
'd6420000-0000-4000-8000-000000000001','d6620000-0000-4000-8000-000000000001',
'd6430000-0000-4000-8000-000000000001','d6630000-0000-4000-8000-000000000001',
'd6440000-0000-4000-8000-000000000001','d6640000-0000-4000-8000-000000000001',
'd6450000-0000-4000-8000-000000000001','d6650000-0000-4000-8000-000000000001'));
select pg_temp.assert_true((select status='passed' and score_percent=100 from public.assessment_attempts where id=:'high_attempt'),'above-threshold score was wrong');
select pg_temp.assert_true((select count(*)=1 from public.course_completions where enrollment_id='d6800000-0000-4000-8000-000000000001'),'retake duplicated completion');
reset role;

-- Expiry is server-enforced, and revoked memberships cannot read or start attempts.
set role authenticated; select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select (public.start_assessment('d6800000-0000-4000-8000-000000000001','d6300000-0000-4000-8000-000000000001','d6900000-0000-4000-8000-000000000006')->>'attempt_id')::uuid as expired_attempt \gset
reset role;
update public.assessment_attempts set expires_at=statement_timestamp()-interval '1 second' where id=:'expired_attempt';
set role authenticated; select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true(public.submit_assessment(:'expired_attempt','{}'::jsonb)->>'status'='expired','expired attempt was accepted');
reset role;
update public.organization_memberships set status='suspended' where organization_id='aaaaaaaa-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000002';
set role authenticated; select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true(public.get_assessment_attempt(:'expired_attempt') is null,'revoked membership retained attempt access');
do $$ begin begin perform public.start_assessment('d6800000-0000-4000-8000-000000000001','d6300000-0000-4000-8000-000000000001','d6900000-0000-4000-8000-000000000007'); raise exception 'revoked membership started attempt'; exception when insufficient_privilege then null; end; end $$;
reset role;
update public.organization_memberships set status='active' where organization_id='aaaaaaaa-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000002';

-- Keys are inaccessible and another tenant cannot see or mutate Northstar history.
set role authenticated; select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin begin perform count(*) from private.assessment_answer_keys; raise exception 'student read answer keys'; exception when insufficient_privilege then null; end; begin perform count(*) from private.assessment_attempt_payloads; raise exception 'student read attempt payloads'; exception when insufficient_privilege then null; end; end $$;
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true(not exists(select 1 from public.assessment_attempts where enrollment_id='d6800000-0000-4000-8000-000000000001'),'cross-school attempt visible');
select pg_temp.assert_true(not exists(select 1 from public.course_completions where enrollment_id='d6800000-0000-4000-8000-000000000001'),'cross-school completion visible');
reset role;

-- An authorized admin records explicit submission; submission does not imply acceptance.
set role authenticated; select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
-- Not ready because required reporting data is absent.
do $$ declare reporting_id uuid; begin
 select id into reporting_id from public.reporting_records where organization_id='aaaaaaaa-0000-4000-8000-000000000001';
 begin perform public.transition_reporting(reporting_id,'submitted','Manual test submission','d6a00000-0000-4000-8000-000000000001'); raise exception 'needs-attention record submitted'; exception when sqlstate '55000' then null; end;
end $$;
select public.add_completion_correction((select id from public.course_completions where enrollment_id='d6800000-0000-4000-8000-000000000001'),'provider_note','','Provider identifier remains intentionally missing','Append-only test note; snapshot is not rewritten.');
select public.update_reporting_identifiers('aaaaaaaa-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',
  '1990-01-01','DEMO-ONLY','AZ','DEMO-PROVIDER-NOT-REAL');
select public.prepare_reporting_record((select id from public.reporting_records where organization_id='aaaaaaaa-0000-4000-8000-000000000001'),'d6a00000-0000-4000-8000-000000000002');
select public.transition_reporting((select id from public.reporting_records where organization_id='aaaaaaaa-0000-4000-8000-000000000001'),'submitted','Manually transmitted by fake administrator','d6a00000-0000-4000-8000-000000000003');
select public.transition_reporting((select id from public.reporting_records where organization_id='aaaaaaaa-0000-4000-8000-000000000001'),'submitted','Duplicate request','d6a00000-0000-4000-8000-000000000003');
select pg_temp.assert_true((select status='submitted' from public.reporting_records where organization_id='aaaaaaaa-0000-4000-8000-000000000001'),'manual submission was not explicit');
select public.transition_reporting((select id from public.reporting_records where organization_id='aaaaaaaa-0000-4000-8000-000000000001'),'accepted','Explicit fake external acknowledgement','d6a00000-0000-4000-8000-000000000004');
select pg_temp.assert_true((select count(*)=3 from public.reporting_events where organization_id='aaaaaaaa-0000-4000-8000-000000000001'),'reporting transition idempotency or history failed');
reset role;
select pg_temp.assert_true((select count(*)=1 from public.completion_corrections),'correction audit was not appended');
do $$ begin begin update public.course_completions set reporting_ready=true; raise exception 'completion snapshot changed'; exception when sqlstate '55000' then null; end; begin update public.assessment_answers set is_correct=false; raise exception 'answer changed'; exception when sqlstate '55000' then null; end; end $$;

rollback;
\echo 'Assessment scoring, completion, reporting, and isolation assertions passed.'

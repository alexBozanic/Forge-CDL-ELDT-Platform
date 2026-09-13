\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end $$;

-- Every authoring command is platform-only.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$ begin
  perform public.create_course('Forbidden school-authored course', 'No.', true);
  raise exception 'ASSERTION FAILED: school administrator authored master curriculum';
exception when insufficient_privilege then null;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select public.create_course(
  'Revision workflow demonstration',
  'Original content used only to verify immutable versioning.', true
) as authored_course_id \gset
select public.create_course_version(:'authored_course_id') as authored_version_id \gset
select public.update_course_version_draft(
  :'authored_version_id', 'Revision workflow demonstration — version 1',
  'Draft preview content; not approved curriculum.'
);
select public.add_course_module(:'authored_version_id', 'Draft module', 1) as authored_module_id \gset
select public.add_course_lesson(
  :'authored_version_id', :'authored_module_id', 'First draft lesson',
  E'# First draft\n\nOriginal test lesson text.', 1, 2
) as first_authored_lesson_id \gset
select public.update_course_module(:'authored_module_id', 'Draft module', 1);
select public.update_course_lesson(
  :'first_authored_lesson_id', 'First draft lesson',
  E'# First draft\n\nEdited original test lesson text.', 1, 2
);
select public.review_course_version(
  :'authored_version_id', 'approved',
  'Content review for this exact test manifest; not regulatory approval.'
);
select manifest_hash as approved_hash from public.course_versions
where id = :'authored_version_id' \gset

-- A draft change produces a different hash, making the exact-hash review stale.
select public.add_course_lesson(
  :'authored_version_id', :'authored_module_id', 'Second draft lesson',
  E'# Second draft\n\nThis change invalidates the earlier review.', 2, 2
) as second_authored_lesson_id \gset
select pg_temp.assert_true((select manifest_hash <> :'approved_hash'
  from public.course_versions where id = :'authored_version_id'),
  'draft edit did not change manifest hash');
do $$ begin
  perform public.publish_course_version((select id from public.course_versions where title = 'Revision workflow demonstration — version 1'));
  raise exception 'ASSERTION FAILED: stale approval published a changed manifest';
exception when object_not_in_prerequisite_state then null;
end $$;
select public.review_course_version(
  :'authored_version_id', 'approved',
  'Second exact-manifest content review; not regulatory approval.'
);
select public.publish_course_version(:'authored_version_id') as published_hash \gset
select pg_temp.assert_true((select manifest_hash = :'published_hash' and manifest is not null
  from public.course_versions where id = :'authored_version_id' and status = 'published'),
  'published manifest/hash was not frozen');
select pg_temp.assert_true((select count(*) = 2 from public.course_version_manifest_lessons
  where course_version_id = :'authored_version_id'), 'published manifest membership is incomplete');
select public.create_course_version(:'authored_course_id') as demo_gate_version_id \gset
select public.add_course_module(:'demo_gate_version_id', 'Demo gate module', 1) as demo_gate_module_id \gset
select public.add_course_lesson(
  :'demo_gate_version_id', :'demo_gate_module_id', 'Demo gate lesson',
  'Demo publication gate fixture.', 1, 1
);
select public.review_course_version(
  :'demo_gate_version_id', 'approved', 'Exact demo gate review; no regulatory claim.'
);
reset role;

do $$ begin
  update public.organizations set status = 'suspended' where is_demo;
  perform public.publish_course_version((select v.id from public.course_versions v
    join public.courses c on c.id = v.course_id
    where c.title = 'Revision workflow demonstration' and v.status = 'draft'));
  raise exception 'ASSERTION FAILED: demo version published without an active demo school';
exception when object_not_in_prerequisite_state then null;
end $$;

-- Published metadata, content, membership, reviews, and event history resist
-- direct mutation/deletion even by the database owner.
do $$ begin
  update public.course_lessons set body_markdown = 'Rewritten'
  where title = 'First draft lesson';
  raise exception 'ASSERTION FAILED: published lesson was rewritten';
exception when object_not_in_prerequisite_state then null;
end $$;
do $$ begin
  delete from public.course_modules where title = 'Draft module';
  raise exception 'ASSERTION FAILED: published module was deleted';
exception when object_not_in_prerequisite_state then null;
end $$;
do $$ begin
  delete from public.course_version_manifest_lessons
  where course_version_id = (select id from public.course_versions where title = 'Revision workflow demonstration — version 1');
  raise exception 'ASSERTION FAILED: published manifest membership was deleted';
exception when object_not_in_prerequisite_state then null;
end $$;
do $$ begin
  update public.course_versions set title = 'Rewritten version'
  where title = 'Revision workflow demonstration — version 1';
  raise exception 'ASSERTION FAILED: published version metadata was rewritten';
exception when object_not_in_prerequisite_state then null;
end $$;
do $$ begin
  delete from public.course_versions where title = 'Revision workflow demonstration — version 1';
  raise exception 'ASSERTION FAILED: published version was deleted';
exception when object_not_in_prerequisite_state then null;
end $$;
do $$ begin
  update public.curriculum_reviews set notes = 'Rewritten review'
  where course_version_id = (select id from public.course_versions where title = 'Revision workflow demonstration — version 1');
  raise exception 'ASSERTION FAILED: exact-manifest review was rewritten';
exception when object_not_in_prerequisite_state then null;
end $$;

-- The existing enrollment remains pinned when a later version is published.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.create_student_enrollment(
  'aaaaaaaa-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'eeeeeeee-0000-4000-8000-000000000001'
) as seeded_enrollment_id \gset
select public.create_course_assignment(
  'aaaaaaaa-0000-4000-8000-000000000001', :'authored_version_id',
  'Later demonstration version'
) as later_assignment_id \gset
select public.create_student_enrollment(
  'aaaaaaaa-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003', :'later_assignment_id'
) as later_enrollment_id \gset
select pg_temp.assert_true((select course_version_id = 'dddddddd-0000-4000-8000-000000000001'
  from public.enrollments where id = :'seeded_enrollment_id'),
  'new publication changed an existing enrollment pin');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select public.retire_course_version(:'authored_version_id', 'Superseded test version');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$ begin
  perform public.create_student_enrollment(
    'aaaaaaaa-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    (select id from public.course_assignments where title = 'Later demonstration version')
  );
  raise exception 'ASSERTION FAILED: student enrolled into a retired version';
exception when check_violation then null;
end $$;
select public.withdraw_course_assignment(:'later_assignment_id', 'Assignment withdrawn in test');
select pg_temp.assert_true((select status = 'active' and course_version_id = :'authored_version_id'
  from public.enrollments where id = :'later_enrollment_id'),
  'retirement or withdrawal rewrote historical enrollment');
reset role;

-- Demo material is database-restricted to explicitly demo schools. Real
-- material still requires a current exact-manifest approval before publication.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select public.create_organization(
  'Non-demo Test School', 'non-demo-test-school', 'school@non-demo.example.invalid'
) as real_organization_id \gset
do $$ begin
  perform public.create_course_assignment(
    (select id from public.organizations where slug = 'non-demo-test-school'), 'dddddddd-0000-4000-8000-000000000001',
    'Forbidden demo assignment'
  );
  raise exception 'ASSERTION FAILED: demo content was assigned to a non-demo school';
exception when insufficient_privilege then null;
end $$;
reset role;
do $$ begin
  insert into public.course_assignments (
    organization_id, course_version_id, title, created_by
  ) values (
    (select id from public.organizations where slug = 'non-demo-test-school'),
    'dddddddd-0000-4000-8000-000000000001',
    'Direct forbidden demo assignment',
    '00000000-0000-4000-8000-000000000001'
  );
  raise exception 'ASSERTION FAILED: direct SQL bypassed the demo-school gate';
exception when check_violation then null;
end $$;
do $$ begin
  update public.organizations set is_demo = false
  where id = 'aaaaaaaa-0000-4000-8000-000000000001';
  raise exception 'ASSERTION FAILED: school demo classification bypassed assignment gate';
exception when object_not_in_prerequisite_state then null;
end $$;
do $$ begin
  update public.courses set is_demo = false
  where id = 'cccccccc-0000-4000-8000-000000000001';
  raise exception 'ASSERTION FAILED: versioned course was reclassified';
exception when object_not_in_prerequisite_state then null;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select public.create_course('Non-demo review fixture', 'Requires exact review.', false) as real_course_id \gset
select public.create_course_version(:'real_course_id') as real_version_id \gset
select public.add_course_module(:'real_version_id', 'Reviewed module', 1) as real_module_id \gset
select public.add_course_lesson(
  :'real_version_id', :'real_module_id', 'Reviewed lesson',
  'Plain original test content.', 1, 2
);
do $$ begin
  perform public.publish_course_version((select v.id from public.course_versions v join public.courses c on c.id = v.course_id where c.title = 'Non-demo review fixture'));
  raise exception 'ASSERTION FAILED: non-demo version published without review';
exception when object_not_in_prerequisite_state then null;
end $$;
select public.review_course_version(
  :'real_version_id', 'approved',
  'Exact content review only; no compliance or instructor claim.'
);
select public.publish_course_version(:'real_version_id');
select pg_temp.assert_true(public.create_course_assignment(
  :'real_organization_id', :'real_version_id', 'Reviewed non-demo assignment'
) is not null, 'reviewed non-demo content could not be assigned');
reset role;

-- Only the enrolled student can record interactions for lessons in the pinned
-- manifest. Duplicate request IDs are idempotent.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true((select count(*) = 3 from public.course_lessons),
  'student could not read exactly the pinned manifest lessons');
select public.record_lesson_interaction(
  :'seeded_enrollment_id', '71000000-0000-4000-8000-000000000001',
  'opened', 1, '81000000-0000-4000-8000-000000000001'
);
select public.record_lesson_interaction(
  :'seeded_enrollment_id', '71000000-0000-4000-8000-000000000001',
  'opened', 1, '81000000-0000-4000-8000-000000000001'
);
select pg_temp.assert_true((select count(*) = 1 from public.lesson_interaction_events),
  'duplicate lesson interaction created duplicate events');
select public.record_lesson_interaction(
  :'seeded_enrollment_id', '71000000-0000-4000-8000-000000000001',
  'completed', 2, '81000000-0000-4000-8000-000000000002'
);
select pg_temp.assert_true((select status = 'completed' and completed_at is not null
  from public.lesson_progress), 'lesson interaction completion did not persist');
do $$ begin
  perform public.record_lesson_interaction(
    (select id from public.enrollments where student_user_id = '10000000-0000-4000-8000-000000000002'),
    (select id from public.course_lessons where title = 'First draft lesson'),
    'opened', 0, '81000000-0000-4000-8000-000000000003'
  );
  raise exception 'ASSERTION FAILED: mismatched version lesson was opened';
exception when insufficient_privilege then null;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
do $$ begin
  perform public.record_lesson_interaction(
    (select id from public.enrollments where student_user_id = '10000000-0000-4000-8000-000000000002'),
    '71000000-0000-4000-8000-000000000001',
    'opened', 0, '81000000-0000-4000-8000-000000000004'
  );
  raise exception 'ASSERTION FAILED: another student wrote enrollment progress';
exception when insufficient_privilege then null;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true((select count(*) = 0 from public.course_lessons),
  'unenrolled other-school student read lesson content');
select pg_temp.assert_true((select count(*) = 0 from public.lesson_progress),
  'other-school student read progress');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true((select count(*) = 1 from public.lesson_progress),
  'school administrator could not see student progress');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true((select count(*) = 0 from public.lesson_progress),
  'other-school administrator read progress');
reset role;

update public.organization_memberships set status = 'suspended'
where organization_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true((select count(*) = 0 from public.lesson_progress),
  'suspended student retained progress access');
do $$ begin
  perform public.record_lesson_interaction(
    (select id from public.enrollments where student_user_id = '10000000-0000-4000-8000-000000000002'),
    '71000000-0000-4000-8000-000000000002',
    'opened', 0, '81000000-0000-4000-8000-000000000005'
  );
  raise exception 'ASSERTION FAILED: suspended student wrote progress';
exception when insufficient_privilege then null;
end $$;
reset role;

do $$ begin
  update public.lesson_interaction_events set resume_position = 99;
  raise exception 'ASSERTION FAILED: interaction history was rewritten';
exception when object_not_in_prerequisite_state then null;
end $$;
do $$ begin
  delete from public.enrollment_events;
  raise exception 'ASSERTION FAILED: enrollment history was deleted';
exception when object_not_in_prerequisite_state then null;
end $$;

rollback;
\echo 'Course authoring, delivery, immutability, and progress assertions passed.'

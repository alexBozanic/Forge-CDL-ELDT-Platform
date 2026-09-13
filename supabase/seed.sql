-- Fake development identities only. Password sign-in is not configured by this seed.
insert into auth.users (id, email, email_confirmed_at)
values
  ('00000000-0000-4000-8000-000000000001', 'platform.admin@example.invalid', statement_timestamp()),
  ('10000000-0000-4000-8000-000000000001', 'admin@northstar.example.invalid', statement_timestamp()),
  ('10000000-0000-4000-8000-000000000002', 'avery@northstar.example.invalid', statement_timestamp()),
  ('10000000-0000-4000-8000-000000000003', 'jordan@northstar.example.invalid', statement_timestamp()),
  ('20000000-0000-4000-8000-000000000001', 'admin@redcanyon.example.invalid', statement_timestamp()),
  ('20000000-0000-4000-8000-000000000002', 'morgan@redcanyon.example.invalid', statement_timestamp()),
  ('20000000-0000-4000-8000-000000000003', 'taylor@redcanyon.example.invalid', statement_timestamp())
on conflict (id) do nothing;

insert into public.organizations (id, slug, name, contact_email, brand_primary_color, brand_accent_color, is_demo)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'northstar-demo', 'Northstar Driving School — Demo', 'office@northstar.example.invalid', '#153B5B', '#F0A202', true),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'red-canyon-demo', 'Red Canyon CDL Academy — Demo', 'office@redcanyon.example.invalid', '#5B2333', '#E07A5F', true)
on conflict (id) do nothing;

insert into public.platform_administrators (user_id)
values ('00000000-0000-4000-8000-000000000001')
on conflict (user_id) do nothing;

insert into public.organization_memberships (organization_id, user_id, role, status)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'school_admin', 'active'),
  ('aaaaaaaa-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'student', 'active'),
  ('aaaaaaaa-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'student', 'active'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'school_admin', 'active'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'student', 'active'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'student', 'active')
on conflict (organization_id, user_id) do nothing;

insert into public.student_profiles (
  organization_id, user_id, legal_first_name, legal_last_name
)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Avery', 'Example'),
  ('aaaaaaaa-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Jordan', 'Example'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Morgan', 'Example'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'Taylor', 'Example')
on conflict (organization_id, user_id) do nothing;

insert into public.audit_events (organization_id, actor_user_id, action, target_type, target_id, metadata)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', null, 'development.seeded', 'organization', 'aaaaaaaa-0000-4000-8000-000000000001', '{"fake_data":true}'),
  ('bbbbbbbb-0000-4000-8000-000000000002', null, 'development.seeded', 'organization', 'bbbbbbbb-0000-4000-8000-000000000002', '{"fake_data":true}');

insert into public.courses (id, title, description, is_demo)
values (
  'cccccccc-0000-4000-8000-000000000001',
  'Demonstration CDL Theory Orientation',
  'Placeholder content for software testing only; not approved curriculum.',
  true
)
on conflict (id) do nothing;

insert into public.course_versions (
  id, course_id, version_number, status, manifest_hash, title, description, created_by
)
values (
  'dddddddd-0000-4000-8000-000000000001',
  'cccccccc-0000-4000-8000-000000000001',
  1,
  'draft',
  repeat('0', 64),
  'Demonstration CDL Theory Orientation',
  'Short software-delivery examples only; not approved curriculum.',
  '00000000-0000-4000-8000-000000000001'
)
on conflict (id) do nothing;

insert into public.course_modules (id, course_version_id, title, position)
values
  ('70000000-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Using the demonstration workspace', 1),
  ('70000000-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Preparing to learn', 2)
on conflict (id) do nothing;

insert into public.course_lessons (
  id, course_version_id, module_id, title, body_markdown, position, estimated_minutes
)
values
  (
    '71000000-0000-4000-8000-000000000001',
    'dddddddd-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    'Know what this demo is',
    E'# Demonstration boundary\n\nThis short lesson shows how Forge presents versioned reading material. It is not approved curriculum and does not authorize regulated training.\n\n- Your school remains the training provider of record.\n- Software readiness is separate from curriculum and provider eligibility.',
    1,
    3
  ),
  (
    '71000000-0000-4000-8000-000000000002',
    'dddddddd-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    'Navigate a pinned version',
    E'# Your assigned version\n\nForge opens lessons only from the exact version pinned to your enrollment. A later revision does not silently change what you were assigned.\n\nUse **Previous** and **Next** to move through the published manifest.',
    2,
    4
  ),
  (
    '71000000-0000-4000-8000-000000000003',
    'dddddddd-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000002',
    'Record an interaction honestly',
    E'# Progress is limited evidence\n\nOpening a page or selecting **Mark lesson interaction complete** records a software interaction. It is not proof of attention, course completion, certification, or reporting readiness.',
    1,
    3
  )
on conflict (id) do nothing;

insert into public.assessments (
  id, course_version_id, kind, title, position, question_count, passing_percent, time_limit_minutes
) values (
  '72000000-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001',
  'final_exam', 'Demonstration software final', 1, 1, 80, 10
);
insert into public.assessment_blueprint_topics (course_version_id, assessment_id, topic_code, required_count)
values ('dddddddd-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'demo_boundary', 1);
insert into public.assessment_questions (id, course_version_id, assessment_id, topic_code, prompt)
values ('72100000-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001', 'demo_boundary',
  'Does completing this demonstration assessment establish certification or regulatory approval?');
insert into public.assessment_options (id, course_version_id, question_id, option_text) values
  ('72200000-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', '72100000-0000-4000-8000-000000000001', 'Yes'),
  ('72200000-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', '72100000-0000-4000-8000-000000000001', 'No; it is fake software-test content only');
insert into private.assessment_answer_keys (course_version_id, question_id, correct_option_id)
values ('dddddddd-0000-4000-8000-000000000001', '72100000-0000-4000-8000-000000000001', '72200000-0000-4000-8000-000000000002');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select public.review_course_version(
  'dddddddd-0000-4000-8000-000000000001',
  'approved',
  'Demonstration content review only; not regulatory or instructor approval.'
);
select public.publish_course_version('dddddddd-0000-4000-8000-000000000001');
reset role;

insert into public.course_assignments (
  id, organization_id, course_version_id, title, created_by
)
values
  (
    'eeeeeeee-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000001',
    'dddddddd-0000-4000-8000-000000000001',
    'Northstar demonstration assignment',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    'eeeeeeee-0000-4000-8000-000000000002',
    'bbbbbbbb-0000-4000-8000-000000000002',
    'dddddddd-0000-4000-8000-000000000001',
    'Red Canyon demonstration assignment',
    '00000000-0000-4000-8000-000000000001'
  )
on conflict (id) do nothing;

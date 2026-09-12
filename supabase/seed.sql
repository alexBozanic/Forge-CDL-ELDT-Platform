-- Fake development identities only. Password sign-in is not configured by this seed.
insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000001', 'platform.admin@example.invalid'),
  ('10000000-0000-4000-8000-000000000001', 'admin@northstar.example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'avery@northstar.example.invalid'),
  ('10000000-0000-4000-8000-000000000003', 'jordan@northstar.example.invalid'),
  ('20000000-0000-4000-8000-000000000001', 'admin@redcanyon.example.invalid'),
  ('20000000-0000-4000-8000-000000000002', 'morgan@redcanyon.example.invalid'),
  ('20000000-0000-4000-8000-000000000003', 'taylor@redcanyon.example.invalid')
on conflict (id) do nothing;

insert into public.organizations (id, slug, name, contact_email, brand_primary_color, brand_accent_color)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'northstar-demo', 'Northstar Driving School — Demo', 'office@northstar.example.invalid', '#153B5B', '#F0A202'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'red-canyon-demo', 'Red Canyon CDL Academy — Demo', 'office@redcanyon.example.invalid', '#5B2333', '#E07A5F')
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

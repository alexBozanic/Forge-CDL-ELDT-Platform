\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at)
values (
  '40000000-0000-4000-8000-000000000001',
  'concurrent@northstar.example.invalid',
  statement_timestamp()
);
insert into public.invitations (
  id, organization_id, email, token_hash, expires_at, created_by
) values (
  'ffffffff-0000-4000-8000-000000000007',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'concurrent@northstar.example.invalid',
  repeat('7', 64),
  statement_timestamp() + interval '1 hour',
  '10000000-0000-4000-8000-000000000001'
);

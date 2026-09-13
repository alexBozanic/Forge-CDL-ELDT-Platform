#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" || -z "${PLATFORM_ADMIN_USER_ID:-}" ]]; then
  echo "DATABASE_URL and PLATFORM_ADMIN_USER_ID are required." >&2
  exit 2
fi
if [[ "${BOOTSTRAP_CONFIRM:-}" != "bootstrap-first-platform-admin" ]]; then
  echo "Set BOOTSTRAP_CONFIRM=bootstrap-first-platform-admin to confirm this controlled operation." >&2
  exit 2
fi
if [[ ! "${PLATFORM_ADMIN_USER_ID}" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$ ]]; then
  echo "PLATFORM_ADMIN_USER_ID must be a UUID." >&2
  exit 2
fi

psql "${DATABASE_URL}" --no-psqlrc -v ON_ERROR_STOP=1 \
  -v bootstrap_user_id="${PLATFORM_ADMIN_USER_ID}" <<'SQL'
begin;
select (count(*) = 0) as no_existing_platform_admin
from public.platform_administrators \gset
\if :no_existing_platform_admin
\else
  \echo 'Bootstrap refused: a platform administrator already exists.'
  do $$ begin raise exception 'first platform administrator already exists'; end $$;
\endif
select exists (
  select 1 from auth.users
  where id = :'bootstrap_user_id'::uuid and email_confirmed_at is not null
) as confirmed_auth_user_exists \gset
\if :confirmed_auth_user_exists
\else
  \echo 'Bootstrap refused: the confirmed Auth user does not exist.'
  do $$ begin raise exception 'confirmed Auth user does not exist'; end $$;
\endif
insert into public.platform_administrators (user_id)
values (:'bootstrap_user_id'::uuid);
insert into public.audit_events (
  actor_user_id, action, target_type, target_id, metadata
) values (
  :'bootstrap_user_id'::uuid,
  'platform_administrator.bootstrapped',
  'platform_administrator',
  :'bootstrap_user_id',
  '{"controlled_database_bootstrap":true}'::jsonb
);
commit;
SQL

echo "First platform administrator bootstrap completed."

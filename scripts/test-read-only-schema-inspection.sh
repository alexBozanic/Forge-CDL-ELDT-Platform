#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  printf 'DATABASE_URL must identify a disposable local PostgreSQL database.\n' >&2
  exit 2
fi

readonly inspection='release/staging-migration-bundle/verify-hosted-schema-read-only.sql'
readonly absent_output="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$inspection" 2>&1)"
grep -q 'migration_history=absent' <<<"$absent_output"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
create schema supabase_migrations;
create table supabase_migrations.schema_migrations(version text primary key, name text);
insert into supabase_migrations.schema_migrations(version,name)
values ('202609120001','foundation');
SQL

readonly present_output="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$inspection" 2>&1)"
grep -q 'migration_history=present' <<<"$present_output"
grep -q 'migration_version=202609120001 migration_name=foundation' <<<"$present_output"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'drop schema supabase_migrations cascade' >/dev/null

printf 'Read-only schema inspection absent/present history assertions passed.\n'

#!/usr/bin/env bash
set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required. Install PostgreSQL client tools or run this command in the Supabase CLI environment." >&2
  exit 2
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  if command -v supabase >/dev/null 2>&1; then
    DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
  else
    echo "Set DATABASE_URL to a disposable PostgreSQL database or install/start the Supabase CLI." >&2
    exit 2
  fi
fi

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f tests/database/bootstrap.sql
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f supabase/migrations/202609120001_foundation.sql
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f supabase/seed.sql
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f tests/database/rls.sql

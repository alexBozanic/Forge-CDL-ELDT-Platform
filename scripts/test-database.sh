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
for migration in supabase/migrations/*.sql; do
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${migration}"
done
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f supabase/seed.sql
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f tests/database/rls.sql
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f tests/database/phase_two.sql
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f tests/database/course-delivery.sql
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f tests/database/assessments-completion.sql
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f tests/database/training-transcripts.sql

# Exercise redemption from two genuinely concurrent PostgreSQL sessions. The
# first transaction holds its successful redemption open while the second waits.
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f tests/database/concurrent-invitation-setup.sql
first_output="$(mktemp)"
second_output="$(mktemp)"
trap 'rm -f "${first_output}" "${second_output}"' EXIT
(
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atq >"${first_output}" <<'SQL'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select public.accept_student_invitation(repeat('7', 64));
select pg_sleep(1);
commit;
SQL
) &
first_pid=$!
sleep 0.1
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atq >"${second_output}" <<'SQL'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select public.accept_student_invitation(repeat('7', 64));
commit;
SQL
wait "${first_pid}"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f tests/database/concurrent-invitation-assert.sql

# Submit one final attempt from two genuinely concurrent sessions. Row locking and
# immutable uniqueness must produce one answer, completion, and reporting record.
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f tests/database/concurrent-assessment-setup.sql
assessment_first="$(mktemp)"
assessment_second="$(mktemp)"
trap 'rm -f "${first_output}" "${second_output}" "${assessment_first}" "${assessment_second}"' EXIT
assessment_sql="select public.submit_assessment((select id from public.assessment_attempts where start_idempotency_key='73100000-0000-4000-8000-000000000004'), '{\"72100000-0000-4000-8000-000000000001\":\"72200000-0000-4000-8000-000000000002\"}'::jsonb);"
(
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atq >"${assessment_first}" <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
${assessment_sql}
select pg_sleep(1);
commit;
SQL
) &
assessment_pid=$!
sleep 0.1
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atq >"${assessment_second}" <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
${assessment_sql}
commit;
SQL
wait "${assessment_pid}"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f tests/database/concurrent-assessment-assert.sql

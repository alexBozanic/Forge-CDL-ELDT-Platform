#!/usr/bin/env bash
set -euo pipefail

for command in createdb dropdb pg_dump pg_restore psql; do
  command -v "$command" >/dev/null || { printf '%s is required.\n' "$command" >&2; exit 2; }
done

readonly host="${PGHOST:-}"
readonly port="${PGPORT:-5432}"
readonly user="${PGUSER:-postgres}"
readonly admin_database="${LOCAL_POSTGRES_ADMIN_DB:-postgres}"
if [[ -z "$host" || ( "$host" != /* && "$host" != 'localhost' && "$host" != '127.0.0.1' && "$host" != '::1' ) ]]; then
  printf 'REFUSED: PGHOST must be a local Unix socket or loopback host.\n' >&2
  exit 2
fi

readonly source_database="forge_recovery_source_$$"
readonly restore_database="forge_recovery_restore_$$"
readonly dump_file="$(mktemp /tmp/forge-recovery.XXXXXX.dump)"
cleanup() {
  dropdb --if-exists -h "$host" -p "$port" -U "$user" "$source_database" >/dev/null 2>&1 || true
  dropdb --if-exists -h "$host" -p "$port" -U "$user" "$restore_database" >/dev/null 2>&1 || true
  rm -f "$dump_file"
}
trap cleanup EXIT

readonly admin_args=(-h "$host" -p "$port" -U "$user")
psql "${admin_args[@]}" -d "$admin_database" -v ON_ERROR_STOP=1 -Atc \
  "select case when inet_server_addr() is null or inet_server_addr() in ('127.0.0.1'::inet,'::1'::inet) then 'local' else 'remote' end" \
  | grep -qx local || { printf 'REFUSED: PostgreSQL server is not loopback/local.\n' >&2; exit 2; }

createdb "${admin_args[@]}" "$source_database"
DATABASE_URL="dbname=$source_database host=$host port=$port user=$user" ./scripts/test-database.sh >/dev/null
pg_dump "${admin_args[@]}" --format=custom --file="$dump_file" "$source_database"
createdb "${admin_args[@]}" "$restore_database"
pg_restore "${admin_args[@]}" --dbname="$restore_database" --exit-on-error "$dump_file"

psql "${admin_args[@]}" -d "$restore_database" -v ON_ERROR_STOP=1 <<'SQL'
do $$
begin
  if to_regprocedure('public.get_training_transcript(uuid)') is null then raise exception 'transcript RPC missing after restore'; end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and c.relrowsecurity) <> 28 then raise exception 'public RLS table count changed after restore'; end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='private' and c.relkind='r' and c.relrowsecurity) <> 3 then raise exception 'private RLS table count changed after restore'; end if;
  if not exists(select 1 from public.enrollment_events) then raise exception 'enrollment history missing after restore'; end if;
  if not exists(select 1 from public.audit_events) then raise exception 'audit history missing after restore'; end if;
  if not exists(select 1 from public.course_completions) then raise exception 'fake completion missing after restore'; end if;
  if has_table_privilege('authenticated','public.assessment_answers','select') then raise exception 'assessment answer grant restored incorrectly'; end if;
end $$;
SQL

printf 'Disposable local PostgreSQL backup/restore rehearsal passed. No hosted system was contacted.\n'

#!/usr/bin/env bash
set -euo pipefail

# Never accepts or prints a password or API key. Use only from a trusted shell
# whose Supabase CLI is already authenticated and linked.
readonly expected_project='uooiziwxmuzdbdcxblox'
readonly confirmation='reconcile-uooiziwxmuzdbdcxblox-pending-migrations'
readonly migration_dir='supabase/migrations'

declare -A expected_hashes=(
  [202609120001_foundation.sql]='2831f5ab9525e2ac5b5a2e9f68ec1b37eca54928cae86e4b5197b35fb6fa85f7'
  [202609120002_identity_invitations_enrollment.sql]='e45c0ae8c99f0c0f5e089e46353fa63c66fbb866f03c78b803c73b096fd45faa'
  [202609120003_onboarding_security_completion.sql]='0dbf157130bde6013b42c6b3799d2305bd2bcec17006c96770acad6c4288bb4a'
  [202609120004_course_delivery_progress.sql]='d93b3492bcd1f9b6c3c9fe5571c40651e7a9cac139020b68022f983866059da3'
  [202609120005_private_redemption_rls.sql]='1795ce56e6941d7b5c246758fb13170fbc991bd68c2a83a3b7305c716951a171'
)

mapfile -t migration_files < <(find "$migration_dir" -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort)
if [[ "${#migration_files[@]}" -ne "${#expected_hashes[@]}" ]]; then
  printf 'REFUSED: migration set differs from the reviewed five-file bundle.\n' >&2
  exit 1
fi

for file in "${!expected_hashes[@]}"; do
  actual="$(sha256sum "$migration_dir/$file" | cut -d' ' -f1)"
  if [[ "$actual" != "${expected_hashes[$file]}" ]]; then
    printf 'REFUSED: source hash mismatch for %s\n' "$file" >&2
    exit 1
  fi
done
printf 'Reviewed migration source hashes match.\n'

if ! command -v supabase >/dev/null; then
  printf 'REFUSED: Supabase CLI is not installed. No mutation attempted.\n' >&2
  exit 2
fi

printf '%s\n' 'Current linked migration history (inspection only):'
supabase migration list --linked

if [[ "${1:-}" != '--apply' ]]; then
  cat <<'EOF'
Inspection complete; no mutation attempted.
Before --apply, run scripts/staging-reconciliation-check.sql in a trusted session.
Confirm that 001-003 schema objects exactly match the reviewed sources, retain the
output privately, and ensure the linked project ref is uooiziwxmuzdbdcxblox.
EOF
  exit 0
fi

if [[ "${STAGING_PROJECT_REF:-}" != "$expected_project" ||
      "${SCHEMA_STATE_VERIFIED:-}" != '001-003-match-reviewed-source' ||
      "${MIGRATION_APPLY_CONFIRM:-}" != "$confirmation" ]]; then
  printf 'REFUSED: project, schema-evidence, and explicit confirmation gates are required.\n' >&2
  exit 3
fi

supabase migration repair --linked --status applied \
  202609120001 202609120002 202609120003
supabase migration list --linked

if [[ "${PENDING_LIST_VERIFIED:-}" != 'only-reviewed-forward-migrations' ]]; then
  printf 'STOPPED after history reconciliation: review pending migrations, then rerun with PENDING_LIST_VERIFIED set. No schema migration was applied.\n' >&2
  exit 4
fi

supabase db push --linked
supabase migration list --linked
printf '%s\n' 'Run scripts/staging-reconciliation-check.sql again and archive its output privately.'

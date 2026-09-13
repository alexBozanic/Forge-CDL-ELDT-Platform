#!/usr/bin/env bash
set -euo pipefail

readonly repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly fixture="$(mktemp -d)"
trap 'rm -rf "$fixture"' EXIT

expect_refusal() {
  local label="$1"
  shift
  if "$@" >"$fixture/stdout" 2>"$fixture/stderr"; then
    printf 'Expected refusal for %s.\n' "$label" >&2
    exit 1
  fi
  if ! grep -q '^REFUSED:' "$fixture/stderr"; then
    printf 'Refusal for %s lacked a safe diagnostic.\n' "$label" >&2
    exit 1
  fi
}

cp -R "$repository_root/supabase/migrations" "$fixture/valid"
"$repository_root/scripts/prepare-staging-migration-bundle.sh" "$fixture/valid" "$fixture/bundle"
test "$(find "$fixture/bundle" -maxdepth 1 -name '2026091200*.sql' | wc -l)" -eq 4
grep -q 'commit 9f435699642b38454c11b96f84f90b7a1f7cf65c' "$fixture/bundle/SOURCE-MANIFEST.txt"
for migration in "$fixture/bundle"/2026091200*.sql; do
  test "$(sed -n '/[^[:space:]]/{p;q;}' "$migration")" = 'begin;'
  test "$(sed -n '/[^[:space:]]/h;${x;p;}' "$migration")" = 'commit;'
done
if find "$fixture/bundle" -type f -exec grep -Eil 'supabase (db push|migration repair)|--apply' {} + | grep -q .; then
  printf 'Generated bundle contains a mutation command.\n' >&2
  exit 1
fi

cp -R "$fixture/valid" "$fixture/mismatch"
printf '\n-- changed\n' >>"$fixture/mismatch/202609120007_training_transcripts.sql"
expect_refusal 'hash mismatch' "$repository_root/scripts/prepare-staging-migration-bundle.sh" "$fixture/mismatch" "$fixture/out-mismatch"

cp -R "$fixture/valid" "$fixture/missing"
rm "$fixture/missing/202609120006_assessments_completion_reporting.sql"
expect_refusal 'missing migration' "$repository_root/scripts/prepare-staging-migration-bundle.sh" "$fixture/missing" "$fixture/out-missing"

cp -R "$fixture/valid" "$fixture/unexpected"
printf 'begin; rollback;\n' >"$fixture/unexpected/202609120008_unreviewed.sql"
expect_refusal 'unexpected migration' "$repository_root/scripts/prepare-staging-migration-bundle.sh" "$fixture/unexpected" "$fixture/out-unexpected"

printf 'Offline migration bundle refusal tests passed.\n'

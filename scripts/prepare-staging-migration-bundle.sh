#!/usr/bin/env bash
set -euo pipefail

# This command only reads reviewed migration sources and writes an offline bundle.
# It never invokes Supabase, connects to a database, or changes migration history.
readonly source_dir="${1:-supabase/migrations}"
readonly output_dir="${2:-release/staging-migration-bundle}"

declare -Ar expected_hashes=(
  [202609120001_foundation.sql]='2831f5ab9525e2ac5b5a2e9f68ec1b37eca54928cae86e4b5197b35fb6fa85f7'
  [202609120002_identity_invitations_enrollment.sql]='e45c0ae8c99f0c0f5e089e46353fa63c66fbb866f03c78b803c73b096fd45faa'
  [202609120003_onboarding_security_completion.sql]='0dbf157130bde6013b42c6b3799d2305bd2bcec17006c96770acad6c4288bb4a'
  [202609120004_course_delivery_progress.sql]='d93b3492bcd1f9b6c3c9fe5571c40651e7a9cac139020b68022f983866059da3'
  [202609120005_private_redemption_rls.sql]='1795ce56e6941d7b5c246758fb13170fbc991bd68c2a83a3b7305c716951a171'
  [202609120006_assessments_completion_reporting.sql]='9758f15fd85ad2ef79bc32059b44384978a478ce1d57ce59ae9496621d80017a'
  [202609120007_training_transcripts.sql]='bcf7565ac5536215dede126fe4c952ab0324cff45226ec6f3bfe4bc5326a00dc'
)

mapfile -t actual_files < <(find "$source_dir" -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort)
mapfile -t expected_files < <(printf '%s\n' "${!expected_hashes[@]}" | sort)
if [[ "$(printf '%s\n' "${actual_files[@]}")" != "$(printf '%s\n' "${expected_files[@]}")" ]]; then
  printf 'REFUSED: migration inventory is missing reviewed files or contains unexpected SQL files.\n' >&2
  exit 1
fi

for file in "${expected_files[@]}"; do
  actual_hash="$(sha256sum "$source_dir/$file" | awk '{print $1}')"
  if [[ "$actual_hash" != "${expected_hashes[$file]}" ]]; then
    printf 'REFUSED: source hash mismatch for %s.\n' "$file" >&2
    exit 1
  fi
done

mkdir -p "$output_dir"
rm -f "$output_dir"/2026091200*.sql
for version in 004 005 006 007; do
  file="$(printf '%s\n' "${expected_files[@]}" | awk -v version="202609120$version" 'index($0, version) == 1')"
  cp "$source_dir/$file" "$output_dir/$file"
done

cat >"$output_dir/SOURCE-MANIFEST.txt" <<'EOF'
INSPECTION-ONLY OFFLINE MIGRATION BUNDLE
Hosted baseline provenance: migrations 001-003 were manually sourced from commit 9f435699642b38454c11b96f84f90b7a1f7cf65c.
This manifest does not prove hosted schema equivalence. Verify the actual linked target and schema independently before any controlled operator action.

Reviewed source SHA-256:
2831f5ab9525e2ac5b5a2e9f68ec1b37eca54928cae86e4b5197b35fb6fa85f7  202609120001_foundation.sql
e45c0ae8c99f0c0f5e089e46353fa63c66fbb866f03c78b803c73b096fd45faa  202609120002_identity_invitations_enrollment.sql
0dbf157130bde6013b42c6b3799d2305bd2bcec17006c96770acad6c4288bb4a  202609120003_onboarding_security_completion.sql
d93b3492bcd1f9b6c3c9fe5571c40651e7a9cac139020b68022f983866059da3  202609120004_course_delivery_progress.sql
1795ce56e6941d7b5c246758fb13170fbc991bd68c2a83a3b7305c716951a171  202609120005_private_redemption_rls.sql
9758f15fd85ad2ef79bc32059b44384978a478ce1d57ce59ae9496621d80017a  202609120006_assessments_completion_reporting.sql
bcf7565ac5536215dede126fe4c952ab0324cff45226ec6f3bfe4bc5326a00dc  202609120007_training_transcripts.sql

Release files 004-007 retain their own BEGIN/COMMIT transaction boundaries. An operator reports they were manually applied on 2026-09-13; do not replay them. Follow the controlled gates and current state in STAGING-SETUP.md.
No command in this bundle repairs migration history, pushes migrations, or derives authorization from environment-string assertions.
EOF

printf 'Prepared inspection-only bundle at %s; no network or database action attempted.\n' "$output_dir"

# Displayed-manifest review and publication guard

## Defect

The previous review RPC accepted a version ID, decision and notes, then read the
current database manifest hash. The form did not send the hash the operator had
seen. If content changed after opening the editor, submitting that stale page
could approve the newer content instead. Publication similarly accepted only a
version ID and could publish a different currently approved manifest.

## Repair and compatibility

New incremental migration `202609160009_review_manifest_preconditions.sql` adds
review/publication wrappers requiring the expected displayed hash. Each verifies
platform authority, locks the draft version row, rejects a mismatched hash and
calls the existing operation under that lock. Authenticated/anonymous execution
of the legacy entry points is revoked to prevent bypass. Their implementations
remain available internally to the wrappers' owner. Authorization checks, review
records, publication prerequisites, immutable history and RLS remain in place.

Forms send the displayed manifest hash, preserve review notes after failures and
show pending/error/success feedback. A stale hash asks the operator to reload and
review the new content. Missing RPCs fail closed with an unavailable-safeguard
message; there is no fallback to the old procedure or automatic mutation retry.
Retirement also receives validated, sanitized feedback without changing its RPC.

Migrations 001–008 and the existing release SQL are unchanged byte-for-byte.
Migration 009 is not added to the legacy 004–007 replay bundle. The offline
inventory verifies its SHA alongside the existing sources and identifies it as a
separate increment. No data rewrite, review backfill or history repair is included.

## Verification

Three application tests cover invalid/missing hashes, exact new RPC payloads,
stale/unavailable failures and no retries/fallbacks (46 application tests total).
The new real PostgreSQL regression checks stale review rejection without a
history write, missing hash rejection, stale publication rejection despite a
current approval, current-hash success, school-admin denial, anonymous denial and
legacy bypass privileges. Existing authoring/publication integration fixtures now
explicitly supply their loaded hash. Disposable restore checks the new functions
and revoked legacy privileges survive restore.

Local frozen install, formatting, lint, typecheck, all application tests, offline
migration bundle checks and production build pass. The shell's default bash
targets unavailable WSL; the bundle check passed using installed Git Bash.
There is no local psql and Docker's Linux daemon is not running, so the actual
database and restore results come from CI. Run `35053334466` at `ce73dd1`
passed both application and database jobs, including disposable restore.

## Hosted rollout gate

Migration 009 has NOT been applied to Supabase. Before hosted review/publication
can resume with the new application, an authorized operator must verify the
target and reviewed migration, apply only this new increment once, and verify
the new RPCs/privileges. Do not replay 001–008 or repair migration history. No
hosted write, merge, production deployment or instructor approval is authorized
or claimed by this development checkpoint. Existing historical reviews are not
altered; their contents are not re-certified by this fix.

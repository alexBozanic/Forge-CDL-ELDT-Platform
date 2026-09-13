# Forge MVP execution plan

Updated: 2026-09-13. Resume from branch `work` after the transcript-validation
milestone descended from checkpoint `3218003`.

## Current milestone

Local implementation is complete through assessment delivery, completion, and
manual reporting. The next milestone is the external integration/readiness gate:
reconcile hosted migration history, apply reviewed forward migrations 004-007,
provision fake Auth users and non-delivering email, run the staging runner, inspect
real browsers, and rehearse backup/restore. Do not deploy to production, reset
hosted staging, send real email, or use real identities.

## Ordered work

1. [x] Add forward-only assessment schema/RPC/RLS migrations and PostgreSQL tests for
       immutable questions/options/private keys, blueprint coverage, exact attempt
       reconstruction, server scoring, prerequisites, thresholds, retries, tenant
       boundaries, and concurrency.
2. [x] Add immutable completion/reporting snapshots, append-only status/correction
       events, transcript reads, CSV neutralization, and corresponding tests.
3. [x] Add minimal accessible platform authoring, student assessment, and school
       reporting UI using only caller-session RPCs and RLS-filtered reads.
4. [x] Run frozen install, formatting, lint, TypeScript, clean PostgreSQL integration,
       production build, and available runtime/UI checks. Update readiness docs and
       commit each coherent milestone.

## Verified baseline

- Commit `fba67dd`: course authoring, immutable lesson manifests, assignments,
  lesson reader, and persistent progress.
- Commit `042d043`: private invitation throttle RLS and hosted-state notes.
- Last local baseline passed frozen install, format, lint, typecheck, clean
  PostgreSQL migration/seed/RLS/onboarding/course/concurrency suites, and build.
- Current local run passed `pnpm install --frozen-lockfile`, `pnpm format:check`,
  `pnpm lint`, `pnpm typecheck`, `pnpm test:db`, the staging runner syntax check,
  and `NEXT_TELEMETRY_DISABLED=1 pnpm build`.
  Database coverage includes scores below/at/above 80, retakes, exact private
  payloads, hidden keys, prerequisites, immutable history, two-tenant isolation,
  reporting transitions, and genuinely concurrent final submission/completion.
- The optimized production server returned HTTP 200 for `/` and `/login` via
  local curl. No browser automation was available, so visual/mobile inspection
  and protected-session navigation remain external gates.
- The continuation verified migration 006 before editing, added migration 007's
  tenant-authorized printable transcript, and passed a fresh disposable
  PostgreSQL 16 run. Coverage now explicitly includes persisted randomized
  order, invalid/foreign options, expired attempts, submitted replay, revoked
  memberships, transcript isolation, lesson timestamps, every attempt, pinned
  version/hash, immutable snapshots, and correction/reporting history.

## External blockers

- This process has no Supabase variables, CLI, Docker, browser automation, or
  hosted Auth test credentials. A single allowlisted HTTPS probe failed at the
  CONNECT tunnel with HTTP 403; do not retry or infer availability from another runtime.
- Hosted project `uooiziwxmuzdbdcxblox` has only migrations 001-003 plus manually
  enabled private throttle RLS. Reconcile hashes/history exactly as described in
  `STAGING-SETUP.md`; migrations 004-007 remain pending. Never reset it or blindly
  replay migrations.
- Hosted Auth/PostgREST/email/browser, backup/restore, and deployment remain
  release gates even after local PostgreSQL and build checks pass.

## Resume instructions

Read `AGENTS.md`, this file, `ARCHITECTURE.md`, `TODO.md`, `SECURITY.md`, and
`STAGING-SETUP.md`; inspect `git status` and recent commits. Resume with the
hash/history reconciliation in `STAGING-SETUP.md`, not `db reset` or blind push.
After migrations 004-007 are reviewed/applied and fake credentials are supplied,
run `node scripts/test-supabase-e2e.mjs`, then browser and backup/restore gates.

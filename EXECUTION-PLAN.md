# Forge MVP execution plan

Updated: 2026-09-13. Resume from branch `work` after the transcript-validation
milestone descended from checkpoint `3218003`.

## Current milestone

Local implementation is complete through assessment delivery, completion, and
manual reporting. Hosted migrations 004-007 are now operator-reported as manually
applied. The next milestone is the external integration/readiness gate: configure
a Vercel preview after the blocked Next.js dependency is safely upgraded,
provision fake Auth users and non-delivering email, run the staging runner, and
inspect real browsers. Do not deploy to production, reset
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
- Release hardening now emits and production-smoke-tests anti-framing, no-sniff,
  referrer, and least-capability permissions headers. Browser roles can no longer
  select submitted assessment answers; aggregate outcomes remain available.
- The checked-in inspection-only 004-007 bundle passed exact-inventory/hash,
  transaction-boundary, missing/unexpected file, mismatch, and no-mutation-command
  tests. Its read-only SQL still requires a trusted operator to verify the actual
  hosted target and archive evidence.
- The read-only hosted inspection now handles both absent and present migration
  history without mutation, with both paths covered against local PostgreSQL.
- A dump/restore rehearsal using existing fake fixtures passed between two fresh
  disposable local PostgreSQL databases, including functions, RLS counts,
  completion, enrollment/audit history, and protected answer grants. This is only
  local recovery evidence, not hosted backup/PITR evidence.

## External blockers

- This process has no Supabase variables, CLI, Docker, browser automation, or
  hosted Auth test credentials. A single allowlisted HTTPS probe failed at the
  CONNECT tunnel with HTTP 403; do not retry or infer availability from another runtime.
- Operator-reported hosted evidence says exact release migrations 004-007 were
  manually applied successfully on 2026-09-13 and the expected RLS/grant posture
  was observed. Migration history remains absent; do not replay migrations or
  manufacture history.
- Hosted Auth/PostgREST/email/browser, backup/restore, and deployment remain
  release gates even after local PostgreSQL and build checks pass.
- Actual-browser keyboard, screen-reader, responsive, and print inspection could
  not run because this environment has no browser automation executable.
- The Vercel Preview compiled from the connected PR4 repository but was correctly
  refused before publication because Next.js 15.5.2 is vulnerable. One official
  npm registry metadata request returned HTTP 403, so no patched version could be
  verified or installed and the lockfile was left unchanged. Approved registry
  access is now the blocking prerequisite; do not bypass Vercel or substitute an
  unverified version.

## Resume instructions

Read `AGENTS.md`, this file, `ARCHITECTURE.md`, `TODO.md`, `SECURITY.md`, and
`STAGING-SETUP.md`; inspect `git status` and recent commits. Do not reconcile
history, reset, seed, or replay the manually applied hosted migrations.
After the exact preview, non-delivering inbox, and confirmed fake credentials are
supplied, run `node scripts/test-supabase-e2e.mjs`, then the browser and hosted
backup/restore gates.

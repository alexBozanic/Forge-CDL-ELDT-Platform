# Delivery checklist

## Foundation

- [x] Accessible demonstration shell with loading, not-found, and error states.
- [x] Initial tenant schema, deny-by-default grants, RLS, composite tenant FK, and audit controls.
- [x] Two-school fake seed model and database integration test specification.
- [x] CI workflow and reproducible commands.
- [x] Generate and commit a dependency lockfile; validate it against the installed package store with frozen-lockfile mode.
- [x] Run install, formatting, lint, type check, and production build in the reset environment.
- [x] Run migrations, fake seeds, and RLS integration tests from a clean local PostgreSQL 16 database.
- [ ] Revalidate dependency versions and Supabase SSR behavior against current official sources.
- [ ] Visually inspect desktop/mobile layouts when browser automation is available.
- [ ] Exercise Auth, JWT, and API behavior using a local Supabase stack or isolated hosted test project.

## Next phase: invitation and organization vertical slice

- [x] Add organization administration commands with audit events.
- [x] Add hashed, expiring, single-use, tenant/email/student-role-bound invitations and local fake delivery.
- [x] Add atomic invitation acceptance with optional version-pinned enrollment.
- [x] Implement the installed Supabase SSR client and middleware cookie-refresh pattern with server-validated identity.
- [x] Add login/logout, protected role-specific routes, organization selection, school branding, and responsive school/student views.
- [x] Add tenant-safe idempotent enrollment assignment and append-only initial transition/audit records.
- [x] Add signup confirmation, password recovery/update, and safe fixed-destination Auth callbacks.
- [x] Add controlled first-platform-admin bootstrap and platform-only school-admin invitations.
- [x] Recheck invitation issuer authority at acceptance, add per-user guessing limits, and test real concurrent PostgreSQL redemption sessions.
- [x] Provide disposable staging setup and an executable Auth/PostgREST verification script without tracked credentials.
- [ ] Test direct REST/database access with real Supabase-issued sessions for two schools.

## Later MVP

### Course authoring and lesson delivery

- [x] Add platform-only draft version/module/lesson authoring with safe preview.
- [x] Add canonical immutable publication manifests and exact-hash review invalidation.
- [x] Require exact current review for demo and non-demo publication; restrict demo assignments to explicit demo schools.
- [x] Add school assignment/withdrawal of existing published versions without rewriting enrollment pins.
- [x] Add enrollment-manifest-bound student overview, lesson reader, resume position, and idempotent interaction progress.
- [x] Show actual pinned version, progress states, and timestamps to authorized school administrators.
- [ ] Verify Auth/PostgREST/email/browser course delivery against the disposable Supabase staging gate.

### Remaining curriculum and completion work

- [x] Immutable curriculum versions, exact-manifest reviews, retirement metadata, and explicit topic coverage blueprints.
- [x] Add separate RLS-protected private answer keys and attempt payloads.
- [x] Add server-selected assessment attempts, persisted random order, private scoring, retakes, prerequisites, and exact 80-percent boundary tests.
- [x] Add atomic idempotent completion with immutable identity/provider/course/attempt snapshots and append-only corrections.
- [x] Add explicit manual reporting readiness, submission, acceptance/rejection, and immutable status events without an FMCSA API.
- [x] Add tenant-safe printable reporting history and CSV export with formula-injection neutralization.
- [ ] Verify the assessment/completion/reporting path through hosted Auth/PostgREST with fake users.
- [ ] Backup, restore, retention, accessibility, and two-school pilot evidence.

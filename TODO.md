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

- [ ] Immutable curriculum versions, exact-manifest reviews, retirement metadata, and theory-unit coverage blueprints.
- [ ] Enrollment-pinned student content access and separate protected answer keys.
- [ ] Learning progress, assessments, exact attempt reconstruction, grading, and idempotent completion.
- [ ] Immutable completion identity/provider snapshots and append-only corrections.
- [ ] Explicit manual TPR submission, acceptance, rejection/needs-attention, and correction events.
- [ ] Tenant-safe transcript and CSV export.
- [ ] Backup, restore, retention, accessibility, and two-school pilot evidence.

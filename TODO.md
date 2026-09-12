# Delivery checklist

## Foundation

- [x] Accessible demonstration shell with loading, not-found, and error states.
- [x] Initial tenant schema, deny-by-default grants, RLS, composite tenant FK, and audit controls.
- [x] Two-school fake seed model and database integration test specification.
- [x] CI workflow and reproducible commands.
- [ ] Generate and commit a verified dependency lockfile when registry access is available.
- [ ] Run install, lint, type check, and production build when registry access is available.
- [ ] Run migrations/tests against local Supabase or PostgreSQL when a runtime is available.
- [ ] Revalidate dependency versions and Supabase SSR behavior against current official sources.

## Next phase: invitation and organization vertical slice

- [ ] Add organization administration commands with audit events.
- [ ] Add hashed, expiring, single-use, tenant-bound invitations.
- [ ] Add atomic invitation acceptance that creates only the intended membership and pinned enrollment.
- [ ] Implement supported Supabase SSR clients/session refresh after documentation verification.
- [ ] Add authenticated organization selection and school-branded shell.
- [ ] Test direct REST/database access with real Supabase-issued sessions for two schools.

## Later MVP

- [ ] Immutable curriculum versions, exact-manifest reviews, retirement metadata, and theory-unit coverage blueprints.
- [ ] Enrollment-pinned student content access and separate protected answer keys.
- [ ] Learning progress, assessments, exact attempt reconstruction, grading, and idempotent completion.
- [ ] Immutable completion identity/provider snapshots and append-only corrections.
- [ ] Explicit manual TPR submission, acceptance, rejection/needs-attention, and correction events.
- [ ] Tenant-safe transcript and CSV export.
- [ ] Backup, restore, retention, accessibility, and two-school pilot evidence.

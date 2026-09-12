# Forge CDL ELDT Platform contributor instructions

## Product boundary

- This repository is software infrastructure for independent schools. Never describe Forge, demonstration curriculum, or a software pilot as FMCSA-approved, certified, compliant, or ready for regulated delivery.
- Schools remain the training providers of record and manually handle TPR submissions.
- Keep software readiness, curriculum approval, provider eligibility, and state-specific eligibility as separate gates.
- Use fake identities and demonstration content in development. Never collect an SSN.

## Engineering rules

- Preserve the modular-monolith architecture documented in `ARCHITECTURE.md`.
- Every tenant-owned relationship must be protected by RLS and, where possible, a composite foreign key containing `organization_id`.
- Treat IDs from requests as untrusted. Authorize using the authenticated database identity and stored memberships.
- Never expose a Supabase service-role key, answer key, invitation secret, or sensitive student data to browser code, logs, URLs, or source control.
- Use migrations for database changes. Do not weaken RLS to make tests pass.
- Published curriculum is immutable except for explicit retirement metadata. Reviews attach to an exact manifest and become stale when draft content changes.
- Historical results use append-only corrections. Never silently rewrite attempts, completions, reporting snapshots, or audit events.
- Add real PostgreSQL integration coverage for every authorization policy and privileged database function.
- Keep dependencies few, pinned, and justified. Do not put `try`/`catch` around imports.

## Required checks

Run before committing when the environment supports dependency installation:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:db
pnpm build
```

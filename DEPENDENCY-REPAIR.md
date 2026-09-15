# Supabase dependency repair — 2026-09-15

The user explicitly approved updating Supabase JS from 2.49.8 to 2.50.0 and
regenerating the previously frozen lockfile to address GHSA-8r88-6cj9-9fh5.

- Supabase JS is pinned at 2.50.0.
- Its auth dependency changes from 2.69.1 to the patched 2.70.0.
- Its realtime dependency changes from 2.11.2 to 2.11.10.
- Supabase SSR stays at 0.6.1; its declared peer range accepts this update.
- Next.js 16.3.5, application behavior, AGENTS, and migrations 001–008 are preserved.

The regenerated lockfile was formatted with the existing repository formatter.
The resulting diff contains only the three Supabase package changes and updated
peer references. Frozen installation succeeds. The production audit reports zero
known vulnerabilities at all severities, compared with one low finding before
the update. All 12 application regression tests pass.

The advisory concerns malformed IDs passed to auth administrative methods. No
calls to the affected methods were found in Forge source, middleware, scripts,
or tests; the package update removes the finding regardless of that observation.

Source: <https://github.com/advisories/GHSA-8r88-6cj9-9fh5>.

Full application/database CI and authenticated Preview verification are required
for this checkpoint. Database and backup/restore checks run in CI's disposable
PostgreSQL service because local PostgreSQL/Docker are unavailable. This does
not authorize hosted migration replay, access grants, or production deployment.

The user-supplied two-page transcript PDF was also rendered and visually checked:
all application content fits, including the assessment table and reporting event.
Optional browser headers/footers are clipped/truncated; disabling those print
decorations removes them. Longer transcripts and PDF text accessibility remain
separate open checks. See the task output `Forge-PDF-verification.md` for details.

Local validation completed: formatting, lint, TypeScript, all 12 application tests, production build, frozen installation, and both production-only and full dependency audits passed (zero known vulnerabilities).

# Hosted role and reporting verification — 2026-09-15

> Later dependency, PDF, and student-record verification is summarized in
> [CURRENT-STATUS.md](CURRENT-STATUS.md). Pending items below reflect this earlier checkpoint.

Latest application tested: PR4, `9a3de99` on
`codex/resume-forge-mvp-validation-from-pr2-checkpoint`.
Browser: authenticated Vercel Preview for Forge Demo CDL Academy (`forge-demo`).
These are fake-data software checks, not curriculum, provider, or regulatory approval.

## Role checks

- The user signed in as `student1@forge.example.invalid`; the dashboard confirmed
  that identity. Self-profile viewing and saving existing Demo Student values
  succeeded, and those values persisted on a new page load.
- Student navigation to platform courses, platform schools, the reporting queue,
  the known administrator transcript, and the administrative student record all
  returned the application Page not found screen.
- A direct student CSV navigation was blocked by the browser client, not confirmed
  as an application HTTP denial. That hosted export-denial check remains open.
- The user then signed in as `schooladmin1@forge.example.invalid`. The dashboard
  confirmed the identity and school-administration role.
- School-admin access to the student record, saving existing fake profile values,
  reporting queue, and historical transcript succeeded. Platform courses, platform
  schools, and the student-only self-profile route returned Page not found.
- These single-school route checks complement PostgreSQL authorization tests;
  they do not establish cross-school hosted isolation or direct API denial.

## Reporting readiness

Under the user's continuation authorization, the school-admin session saved:

- Fake date of birth: `1990-01-01`.
- Fake license/permit: `DEMO-ONLY-001`.
- Jurisdiction: `CO`.
- Fake provider identifier: `DEMO-NOT-TPR`.

The save occurred before a session interruption. On resuming, the agent reopened
reporting and the student record and verified all four values persisted, instead
of resubmitting the mutation.

One Review fields and mark ready action succeeded. Reporting record
`18cdd73a-0bc0-4f90-88a0-71b9e676a339` moved from `needs_attention` to `ready`.
The visible append-only event is dated `2026-09-15 14:14:21 UTC` and says required
reporting fields were reviewed and snapshotted. Neither Record submitted nor
Record accepted was used; no external submission occurred.

The historical transcript retained the original missing-name, birth-date,
license, and provider-ID snapshot. It still shows version 1, a 100% qualifying
score, completion at `2026-09-14 18:16:34 UTC`, and manifest
`3f9f956f097983242862a6f6b971c71394a28cc94f06ba2f45b8a5f4d3be2d7d`.
Its current reporting status and history now correctly show ready.

## Download verification

Clicking Download tenant-safe CSV as the school admin emitted a successful browser
download. The downloaded `forge-demo-reporting (2).csv` was inspected locally:
exactly one row, status ready, student Demo Student, course Forge Platform
Walkthrough — Demo, version 1, score 100, provider DEMO-NOT-TPR, completion
`2026-09-14T18:16:34.336677+00:00`, and the original manifest hash above.
The updated export uses the reporting snapshot; it does not rewrite the original
completion snapshot. A copy is saved in the task outputs as
`Forge-demo-ready-reporting.csv`.

## Next steps and boundaries

### Second-school preparation and transcript route defect

The platform-admin session confirmed only `forge-demo` existed. Created one
empty fake school, Forge Isolation Test Academy (`forge-isolation-test`), using
Create school once. Its workspace showed no students or invitations; its
reporting queue showed no completion records. No memberships were granted.

Before repair, opening the known `forge-demo` completion ID under
`/schools/forge-isolation-test/reporting/` displayed the original school's
transcript to the platform admin. The RPC authorizes the completion's actual
school, but the page did not bind the completion to the route slug. This is a
proven route-context defect; this observation does not establish unauthorized
data exposure to a school admin.

The page now resolves the school through the authenticated RLS client, requires
the completion ID and organization ID to match, then calls the existing
authorized transcript RPC. Missing records and lookup/RPC errors fail closed.
No database functions or migrations changed. `test:transcripts` covers a
globally visible completion requested under the wrong school, the correct school,
missing records, and failures. CI now runs this suite.

Preview deployment `H9JRi2hqwP28ZfvHyoDsjjWYUoA3` completed. The platform-admin
recheck returned Page not found for the mismatched URL and the intact transcript
for the owning school. Local frozen install, formatting, lint, typecheck,
application tests, and production build passed. GitHub application/database
checks passed, including security headers, migration integrity, and disposable
backup/restore.

The user then signed in as `schooladmin1@forge.example.invalid`; the dashboard
confirmed that identity and listed only Forge Demo CDL Academy. Direct navigation
to the second school's workspace, reporting queue, and the mismatched transcript
URL each returned Page not found. The original school's transcript, reporting
queue, and workspace remained accessible. The transcript retained its original
snapshot, manifest, score, completion timestamp, and ready status history.

These checks establish browser-route denial for an existing school administrator
with no membership in the second school. The second school is empty, so this is
not a two-populated-school API/RLS test. No hosted writes occurred during this
school-admin verification.

The in-app browser's print shortcut produced no observable print preview. Actual
printed/PDF layout remains unverified. The existing Auth/PostgREST script also
requires credentials for four fake accounts and performs invitation/access and
assessment mutations; it was not run against the shared Preview database.

- New memberships/access grants require the user's applicable authorization;
  account passwords stay with the user. No credentials were requested or read.
- Student CSV HTTP denial, two-populated-school hosted API isolation, print/PDF visual
  verification, hosted backup/recovery, and the low Supabase advisory remain open.
- Existing GitHub CI covers application/database and disposable local backup and
  restore tests. This document records browser evidence; no code or migration
  repair was necessary for these role/readiness checks.
- No merges, production deployment, migration replay/reset/history repair, real
  personal data, emails, real provider identifiers, or TPR submissions occurred.

# Profile and reporting continuation checkpoint

> Latest hosted role and reporting-ready evidence: [HOSTED-VERIFICATION.md](HOSTED-VERIFICATION.md).
> The demo is now reporting-ready, with no external submission. This supersedes earlier needs-attention notes.

## Latest verified state — 2026-09-15 00:23 UTC

This section supersedes the earlier local-only restrictions and blockers below.
The user explicitly authorized pushing PR4 and its automatic Vercel Preview.
Production deployment, merge, migration history repair, real identities, emails,
and broader access grants remain outside this continuation.

- Application code checkpoint: `df1bbe4c2eb99f82ab971c3ab8116ee475f5a0f6`.
  PR4 remains on the original branch and is unmerged.
- [GitHub run 34912860421](https://github.com/alexBozanic/Forge-CDL-ELDT-Platform/actions/runs/34912860421)
  passed frozen install, format, lint, typecheck, authoring/profile tests,
  migration-bundle checks, production build, security headers, PostgreSQL
  integration tests, and a fresh backup/restore rehearsal.
- CI now executes the existing recovery script inside its disposable PostgreSQL
  service via a local Unix socket. The script's local-target guards are intact.
  No hosted backup/restore was performed.
- Vercel Preview `9civqj6SZZNnhE11QdP3yodNjsvN` completed for that code checkpoint.
- Authenticated Preview browser verification passed: blank-name rejection kept
  the other entered values, an associated first-name error was shown, pending
  save disabled submission, and correcting back to `Demo Student` saved once.
- Student-record/reporting navigation works. The transcript still reports the
  original missing-name completion snapshot, version 1, 100% qualifying score,
  and manifest. Its timestamps explicitly say UTC. Reporting remains
  `needs_attention`; no external submission/acceptance was recorded.
- Mobile checks exposed and repaired transcript and reporting-card overflow.
  At a 390px browser override (375px content width), profile, transcript, and
  reporting document widths equal the 375px viewport. Transcript identifiers
  wrap; the assessment table is a labeled, focusable scroll region. Keyboard
  ArrowRight moved its scroll offset while the page remained within the viewport.
- Migrations 001-008, AGENTS, and the lockfile remain unchanged. Next.js remains
  16.3.5. No additional Supabase migration is required for these repairs.

### Next user-assisted gate

Sign in as the existing fake student `student1@forge.example.invalid` in the
in-app browser to verify self-profile access and denial of administrator pages.
The agent has no student password and will not request it in chat. Afterward,
repeat school-admin and second-school isolation checks with their own sessions.
Print/PDF visual verification, controlled fake reporting-readiness testing,
hosted backup/restore evidence, and the low Supabase dependency advisory remain
open gates. No readiness claim for regulated use is implied.

## Earlier local checkpoint (historical)

Date: 2026-09-14. Branch: `codex/resume-forge-mvp-validation-from-pr2-checkpoint`.
Starting remote commit: `2effa3c85df88e79a132dda86b584c4e2c0c74b8` (PR 4).

## Hosted evidence

- Operator ran the read-only function-existence query and reported `false`.
- Operator then applied migration 008 and reported `Success, no rows returned`.
  This is operator-reported migration evidence, not migration-history reconciliation.
- With explicit user authorization, the agent saved the fake first/last names
  `Demo Student` once through the authenticated Preview student record and
  refreshed. Both values and the new heading persisted.
- A subsequent read-only transcript check still displayed `Not recorded` for
  the historical student name. The original completion time, version 1, manifest
  hash, and 100% qualifying score remained present. Reporting remained
  `needs_attention`; no readiness, submission, or acceptance was recorded.
- A blank first name consisting of spaces was rejected through the Preview form.
  The form then reset the middle-name input `Preserve test` to its old empty
  value. This reproduces a user-input loss defect without saving invalid data.
- These observations concern the existing Preview based on `2effa3c`, not the
  repaired local code. The repaired code has not been pushed or deployed.

## Repair

- Validate required names, lengths, real past birth dates, jurisdiction syntax,
  and request context before the profile RPC. The authenticated RPC and its
  existing database authorization remain authoritative.
- Keep profile inputs controlled so React action resets cannot discard edits.
  Provide associated field errors, accessible action feedback, pending/read-only
  state, sanitized RPC/transport failures, and no automatic mutation retries.
- Add navigation between the student record, school workspace, dashboard, and
  reporting queue, including a profile-edit link from each reporting record.
- Display transcript, student-record, and reporting timestamps explicitly in UTC
  instead of the server's unlabeled locale-dependent representation.
- Add `pnpm test:profiles` and run it in application CI.
- Do not alter migrations 001-008, the frozen lockfile, AGENTS, publication rules,
  RLS, historical completions, or reporting transitions.

## Validation in this Windows workspace

- Frozen install passed with the repository's pnpm 10.28.1 via `npm exec`.
  The default host shim uses pnpm 11 and initially failed on its stricter ignored
  builds policy; that is not the toolchain used for the successful install.
- Formatting, lint, TypeScript, existing authoring tests, new profile tests,
  migration-bundle integrity/refusal tests, Supabase runner syntax, production
  build, production HTTP security headers, and `git diff --check` passed.
- New application coverage includes blank/missing names, excessive lengths,
  invalid/future dates, malformed context, failed and thrown RPC calls,
  preservation of values, no retries, normalized success, and explicit UTC.
- An isolated local Next.js fixture rendered an exact copy of ProfileForm and
  used the same submission helper with a simulated RPC. Browser checks verified
  whitespace validation with associated errors, preservation of middle/last
  names, disabled `Saving…`, sanitized RPC rejection, and subsequent success.
  The fixture is outside the repository and has no Supabase connection. These
  checks do not substitute for hosted Auth/PostgREST or role isolation tests.
- The production dependency audit reported one LOW advisory for
  `@supabase/auth-js` (GHSA-8r88-6cj9-9fh5); no high findings. The audit command
  returned nonzero despite the high threshold. No dependency versions changed.
- Fresh database and restore runs are BLOCKED: `psql` and `createdb` are absent.
  Docker CLI is installed, but its Linux engine pipe was unavailable, including
  after attempting to start the installed Docker Desktop. No hosted DB fallback
  was used. The starting commit's GitHub application/database CI was verified
  successful in run 34890508560; it is baseline evidence only.
- Windows checkout line endings were normalized to exact Git blob bytes for
  otherwise unchanged files so migration hashes and the frozen lockfile are
  preserved. This did not change their tracked content.

## Next gates

1. Run fresh database and restore suites in a disposable PostgreSQL environment.
2. Publish the repaired branch only within the user's deployment authorization;
   a push to this branch automatically creates a Vercel Preview. The earlier
   no-deployment restriction has been retained for this continuation.
3. Recheck the repaired form, navigation, UTC timestamps, mobile/print layout,
   and student versus school-admin access on that exact Preview.
4. Finish reporting readiness using explicitly fake identifiers in a controlled
   test. Do not imply real TPR submission, acceptance, provider eligibility, or
   instructor approval. Preserve the original completion snapshot.
5. Resolve the low Supabase dependency advisory through a separately tested
   dependency change when changing the frozen dependency baseline is authorized.
6. Complete two-school hosted isolation, email-sink, and backup/restore gates.

No merge, deployment, migration replay/reset/history repair, real curriculum,
real student data, credentials, new access grants, or emails were performed.

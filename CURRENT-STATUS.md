# Current Forge software verification status

This is the continuation entry point. Earlier checkpoint documents retain history;
the evidence below supersedes their older pending/blocked statements.

School action follow-up: `SCHOOL-ACTION-RECOVERY.md` covers five administration
operations with validated payloads, preserved inputs and sanitized errors using
the shared recovery form. There are now 39 passing application tests. Prior
assessment-settings checkpoint `1ec6c49` passed CI `35052250552` and Preview
`CSv5kDsoXnd2yTno6HovwW8wkpsa`.

Latest authoring follow-up: `DRAFT-CONTENT-RECOVERY.md` covers module/lesson add
and save forms, validated payloads, retained inputs and sanitized inline errors.
Assessment creation and metadata now use the same recovery form, with additional
server validation and 36 passing application tests. The module/lesson checkpoint
`35a37c5` passed CI `35052032519` and Preview `HJjC3angzfnhrtA1vQhePcGb9GXA`.
The prior lesson
checkpoint `f9735a9` passed CI `35051707322` and Preview
`4f6bxShorv7yDSes3QPQaUTKvmHz`.

Latest follow-up: `LESSON-RECOVERY-VERIFICATION.md` records inline lesson save
recovery, stable keys for manual repeats after uncertain errors, and three new
controller tests (30 total). `TRANSCRIPT-PRINT-FIXTURE.md` records the 60-lesson
synthetic transcript rendering check and the still-open browser PDF export gate.

Latest local follow-up: `ASSESSMENT-BROWSER-VERIFICATION.md` documents a reproduced
native radio reset defect and its fix, plus corrected answer-option layout.
Actual browser checks now pass for keyboard selection, repeated failure answer
preservation, pending controls, focus and mocked confirmation. All 27 application
tests and the production build pass. Hosted integration and screen-reader
verification remain separate gates. The reproducible fixture lives outside the
application and never writes hosted data.

Previous verified branch checkpoint: `e8c6196`, CI `35039071644` passed application,
database and restore; Preview `C4cC4f4sHA3HJnEvjRJ2WtCzhcow` was Ready.

Read `MVP-READINESS.md` for the current build inventory, independent development
backlog and external acceptance gates. Instructor edits to the separate bank are
in progress; no reviewed workbook or approval has been received.

Latest verified release before the start-form follow-up: `a0fe2ab`, CI
`35038512375`, Preview `B5iYTiA1452GjFYybPDYVmaNMUUq`. All 23 application tests,
database integration and disposable restore passed. The browser followed View
latest result and showed the existing passed 100% result without final answers.

The assessment start follow-up adds safe inline action errors, pending state,
course navigation and a server-generated request key bound to each rendered
form, preserving database idempotency on manual resubmission. It adds four tests
(27 application tests total), all passing locally with frozen install, format,
lint, typecheck and build. CI/Preview evidence follows in the task checkpoint.

Current development follow-up: `ASSESSMENT-SUBMISSION-REPAIR.md` records student
submission error recovery, answer preservation, accessible feedback and eight
additional application regression tests. Instructor review of the separate
120-question draft workbook is now proceeding in parallel; no content has been
imported or approved by this software work.

Submission repair commit `0492635` passed CI `35038329859` (application,
PostgreSQL, and disposable restore) and Preview deployment
`3VNiSwZs8rZ1gtFDHrnJB9MMdhDM`. The subsequent result-navigation follow-up adds
a direct link from the course to the student's latest saved attempt.

Latest follow-up: `STUDENT-KEYBOARD-VERIFICATION.md` records the student profile
keyboard walkthrough and completed-course resume/navigation repair. Local frozen
install, formatting, lint, typecheck, all 15 tests, and build passed for that repair;
its CI and Preview verification follow the earlier baseline below.

## Earlier verified application checkpoint

Application commit: `437748d`, on the existing PR4 branch
`codex/resume-forge-mvp-validation-from-pr2-checkpoint`.

- CI run `35034214220` passed application and database jobs: frozen install,
  formatting, lint, typecheck, all 15 application tests, migration-bundle checks,
  build, HTTP security headers, PostgreSQL suites, and disposable backup/restore.
- Preview deployment `88pNDQPTaBX9oBU33TKmuU7kiR8h` completed.
- A missing student UUID now returns Page not found; the existing Demo Student
  profile and history still load. The new school Dashboard link was focused with
  Tab and activated with Enter. No hosted writes were needed for these checks.
- Supabase JS 2.50.0 and its regenerated lockfile were explicitly approved by the
  user. Commit `4830810` resolved the low auth-js advisory. Full and production
  audits reported zero known vulnerabilities at that checkpoint.
- The supplied two-page PDF was rendered and visually inspected. Application
  content fits; browser print decorations can be disabled to remove their
  clipped date header/truncated URL footer. Long-record pagination and PDF text
  accessibility are not established by this sample.
- Prior browser checks verified student/school-admin routes, current-profile
  preservation, the immutable completion snapshot, fake reporting readiness,
  CSV download, mobile layouts, and the transcript table's keyboard scrolling.
- The existing school admin cannot open the empty second school's workspace,
  reporting queue, or mismatched transcript URL. This is browser-route evidence,
  not a two-populated-school direct API test.

See `HOSTED-VERIFICATION.md`, `DEPENDENCY-REPAIR.md`, and
`STUDENT-RECORD-REPAIR.md` for the relevant changes and evidence. Task outputs
contain the PDF inspection and post-deployment verification reports.

## Concrete remaining gates

1. **Direct Auth/PostgREST isolation.** The existing staging runner needs four
   confirmed fake accounts and creates invitations/access, attempts, and reporting
   records. Do not run it against the shared Preview under a read-only scope.
   Use a separately authorized disposable Supabase environment and fixture setup;
   credentials must remain in a local secret store, never in chat or tracked files.
   Local Docker/PostgreSQL were unavailable in this workspace; CI's PostgreSQL
   service does not supply Supabase Auth/PostgREST.
2. **Export HTTP denial.** Student export navigation and the latest school-admin
   navigation to the other school's export were blocked by the browser client.
   No HTTP authorization result was observable. Source inspection confirms role
   and tenant filtering, but this does not replace the missing runtime evidence.
3. **Hosted recovery and operations.** Disposable database backup/restore passed;
   hosted recovery, retention decisions, Auth abuse controls, and monitoring still
   require operator evidence and separate authorization for service changes.
4. **Broader accessibility.** Complete the remaining student/assessment keyboard
   and screen-reader walkthrough and long-record/PDF accessibility checks. Existing
   navigation/mobile evidence is limited to the recorded paths and sample data.
5. **External decisions.** Curriculum review, provider eligibility, and state
   requirements are separate from software validation and are not inferred.

## Continuing safely

No production deployment, merge, hosted migration replay/reset/history repair,
new account/access grants, real data, emails, or external reporting is authorized
by this status document. Preserve migrations 001–008, AGENTS, Next.js 16.3.5, and
the newly verified lockfile. The fake reporting record remains ready, with no
submitted or accepted event. Do not invent more mutations to demonstrate progress.

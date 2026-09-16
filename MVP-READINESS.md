# Forge MVP readiness and remaining work

This checklist separates implemented software from verification and real-school
launch requirements. About 90% toward a controlled fake-data software pilot is
an engineering estimate, not a measured completion ratio or authorization to
deliver regulated training. No defensible overall real-training percentage can
be given while curriculum and provider/state decisions remain open.

## Implemented software

| Area                     | Current evidence                                                                                                                                                | Remaining acceptance work                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Authentication and roles | Sign-in and role-specific Preview navigation observed; server identity checks, RLS and tenant constraints implemented                                           | Complete direct Auth/JWT/PostgREST tests using disposable fixtures; confirmation/recovery and abuse-control evidence |
| School administration    | Schools, invitations, assignments and student profile workflows implemented and sampled in Preview                                                              | Two populated schools and direct unauthorized API/export denial evidence                                             |
| Curriculum authoring     | Draft modules, lessons, questions, blueprints, exact-hash review and immutable publication implemented                                                          | Instructor-approved real content and blueprint; validate ingestion before publication                                |
| Student learning         | Version-pinned enrollment, lessons, progress and resume implemented                                                                                             | Full active-enrollment keyboard, assistive-technology and failure walkthrough                                        |
| Assessment               | Server selection, private keys, server scoring, deadlines, retakes and immutable attempts implemented                                                           | Browser failure/pending/focus preservation checks on fake active attempts; review timing/accessibility policy        |
| Completion and reporting | Immutable completion snapshots, append-only corrections, manual reporting states, CSV and printable records implemented                                         | Long-record print/PDF accessibility, direct export authorization and operating procedure sign-off                    |
| Release quality          | Frozen install, formatting, lint, TypeScript, application tests, build, security headers, PostgreSQL suites and disposable restore pass at recorded checkpoints | Hosted recovery/monitoring/retention evidence and controlled pilot acceptance                                        |

## Software work that can continue independently

1. Local fake assessment start/submission recovery browser checks passed; see
   `ASSESSMENT-BROWSER-VERIFICATION.md`. Broader browser and assistive-technology
   coverage remains open, along with hosted active-attempt verification.
2. Exercise long-record print layouts with synthetic data and document actual
   pagination and accessibility limitations.
3. Review remaining form/action error paths and fix reproducible failures, with
   focused regression coverage rather than rebuilding completed features.
4. Keep the existing PR branch tested and reviewable; preserve migration bytes,
   RLS, immutable history and the pinned dependency lockfile.

## Gates requiring external input or specific authorization

1. **Disposable live integration:** authorize an isolated Supabase test setup
   with fake confirmed accounts and two populated schools. Test direct API
   isolation, revoked memberships, invitation replay, cookie/session refresh,
   unauthorized exports and the full learner-to-reporting path. Do not reset or
   repurpose the shared completed Preview record.
2. **Hosted operations:** identify the owner and approve backup/recovery testing,
   retention policy, monitoring/alerts, Auth abuse controls and the support/recovery
   procedure. A disposable PostgreSQL restore does not prove hosted recovery.
3. **Instructor review:** receive the edited 120-question workbook. All entries
   were pending at handoff; approval counts remain unknown until reviewed output
   is supplied. Resolve corrections, verify sources and full curriculum coverage,
   decide assessment topic counts and retake/timing policies, and then authorize
   a draft import. A question bank is not the full lesson curriculum.
4. **School eligibility and launch:** the school must establish provider and
   state eligibility and approve its curriculum/operations. Plan a controlled
   pilot with acceptance criteria, then separately approve merge and production
   release. Schools manually perform external reporting; Forge does not submit
   to TPR automatically.

## Background follow-up

An hourly same-task follow-up continues evidence-backed development and
verification. It reports meaningful progress or decisions and pauses when only
external blockers remain. The instructor workbook stays separate and untouched.
No production merge/deployment or hosted mutation is included in that follow-up.

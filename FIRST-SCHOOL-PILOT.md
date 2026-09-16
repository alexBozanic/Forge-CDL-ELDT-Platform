# First-school pilot: practical acceptance plan

As of 2026-09-16, core software is implemented. About 90% toward a controlled
fake-data pilot remains an engineering estimate, not a measured ratio. The next
milestone is a staff-only rehearsal, not real student enrollment or regulated
training. Question-bank review is nearing completion per the operator; no edited
workbook or instructor approval has yet been received in this task.

## Three stages

| Stage                     | Participants and data                                                                                          | Entry condition                                                                                                          | Exit evidence                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Staff walkthrough         | One school lead/instructor using demonstrations                                                                | Arrange a supervised session on the intended test environment                                                            | Usability feedback on school, learner, assessment and reporting workflows     |
| End-to-end acceptance     | Suggested one school administrator and two fake learners, plus a second synthetic school for isolation testing | Authorized isolated hosted setup, migration 009 applied once after target review, known test dataset                     | All acceptance steps below pass, with defects resolved or explicitly accepted |
| Limited real-school pilot | Named school staff and an agreed small student cohort                                                          | Approved curriculum, operating arrangements, hosted security/recovery evidence, and separate production release approval | School lead accepts results and support procedure                             |

A walkthrough can be planned now while content is reviewed. The end-to-end test
must not reuse or reset the shared completed Preview record. Do not enter real
student information in an unapproved test environment.

## Acceptance session

Record the commit/deployment, environment, test roles, timestamps, expected result,
actual result and defect reference for each step. Use fake identities only.

1. Administrator and learners sign in, recover access and sign out. Confirm role
   restrictions, revoked membership behavior and session refresh.
2. Administrator assigns a pinned course version. Learners see only their own
   enrollment and resume their saved lesson progress.
3. Complete required lessons. Verify incomplete work cannot produce a completion.
4. Run assessment pass and fail paths, deadline expiry, authorized retake, reload
   and uncertain submission recovery. Verify answers remain private and server
   scoring is authoritative; an uncertain write must not be blindly repeated.
5. Inspect the immutable completion and append-only reporting history. Verify
   required profile fields, manual ready/submitted/accepted/rejected transitions,
   CSV content, all queue pages and actual saved PDF pagination.
6. Directly request another school's records/exports and another learner's
   attempts under each test identity. Database unit tests alone do not satisfy
   this hosted Auth/JWT/PostgREST requirement.
7. Complete keyboard and assistive-technology checks, then demonstrate the support
   and recovery procedure. Record the school lead's acceptance separately from
   curriculum approval and production authorization.

## Content handoff

Receive the instructor's edited 120-question workbook with explicit per-question
approval/corrections, answer keys, explanations, topic mapping and source notes.
Validate missing answers, duplicates, ambiguous options, source/coverage gaps and
blueprint counts before preparing an import preview. Answered is not the same as
approved. Do not infer approval or import automatically.

The school/instructor also needs to approve lesson content and the assessment's
pass threshold, topic counts, timing and retake policy. A question bank alone does
not provide the complete lesson curriculum. Forge does not establish provider or
state eligibility; those remain school decisions outside software test acceptance.

## Current release gates

- Migration 009 has passed disposable database tests but is not installed hosted.
  Review/publication intentionally fail closed until the one-time rollout.
- Isolated hosted test target, fake accounts and two-school data require specific
  authorization. No new accounts/access or hosted writes are currently authorized.
- Hosted backup/recovery, monitoring, retention and support need a named owner
  and evidence; local restore tests do not prove hosted recovery.
- Instructor output and full curriculum acceptance are pending.
- Actual PDF and assistive-technology evidence remain pending.
- Merge and production deployment remain separate decisions.

The operator's next useful handoff is the edited workbook, the first school's
named pilot lead, and the intended test environment. The exact hosted changes
must be reviewed before execution; this plan does not authorize them.

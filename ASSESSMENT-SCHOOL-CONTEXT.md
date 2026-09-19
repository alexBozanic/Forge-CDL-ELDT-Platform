# Assessment school context

Source inspection found that assessment start and result pages used enrollment
or attempt identity without binding it to the school slug in the URL. Database
RLS/RPC ownership checks still applied; this finding is not evidence of another
learner's data being exposed. It could display a learner's own assessment under
an unrelated school route, with inconsistent navigation.

The shared authenticated lookup now resolves the requested school, then requires
both its organization ID and the signed-in learner ID on the enrollment. Both
pages and the start/submit server actions use this check before assessment RPCs.
Malformed inputs and lookup/transport failures fail closed. Existing scoring,
private keys, deadlines, idempotency and immutable results remain database-owned.
Completed enrollments remain eligible for historical reads and permitted retakes.

Three synthetic regressions cover another school, another learner, missing and
malformed context, database failures and completed enrollment compatibility.
These do not substitute for hosted two-school Auth/PostgREST acceptance.

The authorized Taylor's rehearsal setup already exists in Preview under
forge-demo: one new assignment and fresh active enrollment for the existing fake
student. Original completion is intact. Learner walkthrough awaits the operator
switching from platform-admin to student1@forge.example.invalid. Do not create
the assignment or enrollment again or request that authorization again.

Verification: frozen install, formatting, lint, TypeScript, 74 application tests,
production build and protected-file checks pass locally. Database/restore and
HTTP security gates run in CI; hosted learner recheck remains pending.

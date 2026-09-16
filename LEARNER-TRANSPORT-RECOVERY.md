# Learner form transport recovery

Assessment start, answer submission and student profile forms previously handled
returned controller errors but did not catch failures of the server-action call
itself. These client boundaries now preserve local inputs, restore pending
controls and show safe recovery instructions when the action rejects. Next.js
navigation signals are rethrown for the framework to handle. No mutation retry
is automatic. Assessment start/submission reuse the same failure messages as the
server controllers. Scoring, deadlines, authorization and request keys are unchanged.

Profile save now also cancels native reset and focuses its error alert, retaining
controlled field values. The server does not receive any new client authority.

Actual local browser checks with unchanged copied forms and fake callbacks:

- Profile: fake first/last name, permit and jurisdiction remained after the action
  threw; fields were readonly while pending, then editable; error received focus.
- Assessment start: thrown action restored the button, focused the safe error
  and offered the course/existing-attempt link.
- Submission: Green and Circle remained selected after a thrown action, count
  stayed two of two, controls recovered and focus moved to the safe summary.
  A second returned failure also preserved choices; the third manual submission
  showed fake confirmation and locked controls.

These are browser/server-action transport simulations, not hosted mutation or
screen-reader evidence. The reproducible fixture now throws on submission one,
returns an RPC failure on submission two and confirms fake success on three.
Restart its server to reset this counter. No real student data or attempt was used.

All 60 application tests, frozen install, formatting, lint, typecheck and production
build passed locally. CI provides real PostgreSQL and disposable restore checks;
there is no local database service. Protected migrations, release SQL, AGENTS and
lockfile remain unchanged.

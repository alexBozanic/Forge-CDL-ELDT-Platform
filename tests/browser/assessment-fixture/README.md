# Local assessment browser regression fixture

From the repository, after frozen installation, run:

```sh
node scripts/prepare-assessment-browser-fixture.mjs /absolute/new/directory
```

The parent directory must exist. The destination must be new and outside the
repository. From that directory run:

```sh
node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3721
```

Open localhost port 3721. The generator copies the actual forms, controllers,
layout and stylesheet unchanged, records SHA-256 hashes, and links the existing
installed dependencies. It substitutes fake action callbacks only; no environment
files, credentials, authentication, database or hosted writes are used. Do not
deploy this fixture. Stop the local server after verification.

1. Submit with no answers. Native validation should focus the first radio without
   invoking the action.
2. Use Tab, Space and arrow keys to select Green and Circle. The count should be
   two of two.
3. Submit. During the four-second callback, radios and button must be disabled.
4. After failure, both selections must remain visibly checked, the count must
   agree, and focus must move to the sanitized error summary. Private fixture
   details must not appear.
5. Submit manually again. The second, returned RPC failure must preserve selections
   and focus the summary again. There must be no automatic resubmission.
6. Submit manually a third time. The fake success must show Submission confirmed,
   disabled controls and the result link. This does not prove a saved database
   result; do not follow the fixture result link.
7. Start the separate assessment fixture. Check disabled Starting assessment,
   then a focused prerequisite error and course recovery link.
8. Inspect radio layout: each radio must appear beside its label, with a generous
   clickable label area rather than an oversized centered input.

These are manual browser regression checks, not a CI browser suite or a
screen-reader audit. Restart the fixture server to reset the submission count.
The first submission throws a transport-style error; the second returns an RPC
error; the third returns fake success.

The lesson progress fixture also uses the production client/helper. Each new
request key fails once, then succeeds on a manual retry; server logs record keys.
Check both resume-save and lesson-complete buttons: pending disables every lesson
control, failure focuses a sanitized alert, retry retains the same key and success
restores the controls and announces the outcome. Confirmed new operations use a
new key. The initial opened interaction is also fake and does not save real data.

The draft content fixture always returns a delayed RPC error. Edit its title and
body, submit, and check that the fieldset disables during the delay. After the
failure, edited values must remain and the sanitized error must receive focus.

The profile transport fixture throws after four seconds. Enter fake names and
optional fake permit/jurisdiction values; verify readonly pending fields, retained
values and a focused error after failure. The Start transport fixture similarly
throws and must restore its button and show a focused recovery link/message.

The auth fixture uses synthetic default credentials and no provider connection.
Edit only the fake email, submit, and check retained fields and focused error.
The separate success-redirect control must reach /?fixture=redirected without
showing a false failure. Invitation fixtures use example.invalid addresses only;
student failure is returned, administrator failure is thrown. Emails/assignment
must survive, controls must disable while pending and errors must receive focus.

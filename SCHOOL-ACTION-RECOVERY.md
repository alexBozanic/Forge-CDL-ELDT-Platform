# School administration action recovery

School settings, assignment creation/withdrawal, invitation revocation and student
enrollment previously threw RPC errors from ordinary forms. They now validate
their expected IDs and required values and return sanitized action state.
School colors require six-digit hex values; optional contact email must be
plausible when supplied. Validation is not authorization: every action still uses
the authenticated client and the existing permission-checking RPC.

The existing draft recovery form has been extracted into a shared MutationForm,
retaining the draft-specific messages through its wrapper. School forms use the
same disabled pending fieldset, accessible status, focused error and canceled
native reset. Failed submissions preserve user entries. Uncertain outcomes tell
the operator to check the current record before a manual repeat; no retry loop,
new grant, invitation token generation or hosted enrollment is performed here.

Three tests cover invalid IDs/fields, exact payloads for all five operations,
sanitized RPC/transport errors and no automatic retries or input mutation.
All 39 application tests and local frozen install, formatting, lint, TypeScript
and build passed. The shared form was rechecked in the local browser after
extraction: pending disabled all fields, edited title/body survived the fake
failure, and the error received focus. This does not prove hosted tenant
authorization, which remains a direct API integration gate.

Remaining action review: reporting mutations; course creation/revision and
publication/review; invitation creation/acceptance and authentication transports.
Existing credentials, users, memberships and published records are unchanged.

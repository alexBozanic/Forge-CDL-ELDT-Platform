# Lesson progress recovery

The existing lesson interaction buttons awaited a server action that threw raw
RPC errors. The manual-save transition had no failure handling, so it could
produce an unhandled failure instead of recoverable feedback.

The action now validates UUIDs, supported interaction types and PostgreSQL integer
position bounds, then returns sanitized state. The authenticated RPC still owns
enrollment authorization, pinned-version membership, progress and audit history.
No SQL or RLS changed. Successful saves alone trigger revalidation.

The client catches transport failures, focuses an inline error, exposes a course
progress link and disables controls while pending. A failed/uncertain request
retains its key for a manual repeat of the same operation and position. Confirmed
success retires that key. There are no automatic retries. A late opened-event
failure cannot overwrite manual-save feedback, and changing lessons remounts
the interaction state.

Three controller tests cover invalid IDs/types/positions, sanitized RPC and
transport failures without retries, and exact successful payload forwarding.
The local browser fixture uses unchanged client/helper copies with delayed fake
callbacks; see the assessment fixture recipe for execution. It confirms pending
buttons, focused failure feedback and successful manual resume-save recovery.
Request-key reuse is checked against the fake server log. This does not establish
hosted authentication or persistence and changes no real progress record.

Local frozen installation, formatting, lint, TypeScript, all 30 application tests
and production build passed. CI provides real PostgreSQL, disposable restore,
migration bundle and HTTP header checks for the committed branch.

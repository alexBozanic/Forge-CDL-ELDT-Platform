# Course, school and invitation creation recovery

Course and revision creation validate inputs and returned IDs before navigation.
If course creation succeeds but the initial version fails or cannot be confirmed,
the error directs the operator to inspect the existing course rather than create
it again. No automatic retry is added. School creation validates name, slug and
optional contact email. Both use the shared pending/error/input recovery form.

Student and administrator invitations validate IDs and email before generating a
secret or calling the authenticated RPC. The database still authorizes school,
assignment and administrator access. Failed or uncertain requests return a safe
message directing the operator to inspect pending invitations before repeating.
Only a confirmed successful callback returns a token. Secret generation remains
server-side; no email is sent. Previously displayed tokens are not submitted as
action state on a later request, and are hidden while that request is pending.

Both invitation forms retain email with controlled state, preserve assignment
selection, disable controls while pending, and focus an accessible alert after
failure. Local browser testing used unchanged copies of the forms and hook with
fake callbacks: student RPC failure and administrator transport rejection both
retained the fake emails, restored controls, and focused sanitized feedback.
Screenshots confirmed the email values and selected fake assignment. These are
local UI observations, not hosted invitation, email or screen-reader verification.

The reproducible fixture generator includes these forms. Use the existing recipe
in tests/browser/assessment-fixture/README.md, then exercise the invitation
section with an example.invalid email and the fake assignment. The student
callback returns an error after four seconds; the administrator callback throws.
Neither callback creates a real secret, account, invitation or database record.

Seven new application tests cover invalid inputs before callbacks, exact course
and school payloads, successful course/revision IDs, partial course creation,
invitation normalization, withheld tokens and sanitized failures without retries.
All 53 application tests, frozen install, format, lint, typecheck, production
build and offline migration bundle checks passed locally. Real database and
restore verification runs in CI because local PostgreSQL is unavailable.
Protected migrations, release SQL, AGENTS and the frozen lockfile are unchanged.

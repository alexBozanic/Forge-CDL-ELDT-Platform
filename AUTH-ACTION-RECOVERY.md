# Authentication and invitation-acceptance recovery

Login, signup, password recovery/update, invitation acceptance and dashboard
sign-out use the shared pending/error form. Expected provider failures and
transport rejection return sanitized feedback rather than raw errors or false
success. Sign-out only redirects after confirmed provider success. Login still
requires getUser validation after password authentication; protected actions
still require the authenticated user and database authorization.

Signup and recovery retain a conditional, identical notice for success, provider
rejection and transport failure. The UI does not confirm account existence or
email delivery. Input syntax errors are validated before provider calls. Passwords
remain exact opaque strings. Action state never echoes passwords or invitation
tokens. No automatic retry is introduced. Invitation failures link to the
dashboard to inspect membership before repeating an uncertain acceptance.

A local browser regression exposed a shared-form defect: catching a successful
Next.js redirect produced a false error at the destination. The shared form and
invitation hook now use Next's unstable_rethrow before sanitizing ordinary
errors. The pinned Next 16.3.5 browser implementation was inspected locally.
The same fixture now reaches /?fixture=redirected without an error alert.
Local synthetic auth failure also disabled controls, retained the edited fake
email, restored controls and focused sanitized feedback. These are fake local
callbacks, not hosted authentication, email or credential changes.

Five new application regressions cover validation before callbacks, exact
credential forwarding without state disclosure, indistinguishable signup/recovery
outcomes, rejected/thrown login/update/logout outcomes, and invitation validation,
success and uncertain failure without retry. There are 60 application tests.
The fixture generator includes the auth controller and synthetic failure/redirect
controls for repeatable browser checks. No real account or credential was used.

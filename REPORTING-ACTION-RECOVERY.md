# Reporting mutation recovery

Reporting identifier updates, preparation and manual status transitions now use
sanitized inline feedback with retained fields and disabled pending controls.
The controller validates the school/record IDs, actual calendar birth date,
required identity/provider fields, supported statuses and nonempty evidence.
The database still checks caller authority, current status and readiness.

Preparation and transition request keys are generated on server render and bound
to each form action. Manual repeats of that rendered form retain the key; the
action no longer generates a new key on each submission. Refreshing the page
creates a new key, so uncertain errors still require checking existing status
and history before a repeat. No automatic retry is added.

Four tests cover invalid identifiers/dates/statuses, exact RPC payloads, stable
request keys across manual repeats, sanitized failures and unchanged form values.
All 43 application tests and frozen install, formatting, lint, TypeScript and
production build pass locally. The shared form's pending/focus/preservation
behavior was already verified using local fake callbacks; no hosted reporting
record was changed and no external submission was sent. Direct hosted reporting
authorization and state-transition checks remain an integration gate.

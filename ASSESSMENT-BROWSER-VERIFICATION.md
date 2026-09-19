# Local assessment browser verification

Verified September 16, 2026 UTC in the Codex in-app browser using local fake
actions and unchanged copies of the production forms/controllers/styles.
See `tests/browser/assessment-fixture/README.md` for reproduction.

## Reproduced defects and repair

React's post-action native form reset cleared both radio DOM selections after
a failed submission even though controlled values and the answered count stayed
at two. Controller unit tests could not detect this browser behavior. Canceling
the form reset preserves the visible selections as well as the controlled state.
No scoring, authorization, attempt history or retry policy changed.

The general form label grid rule also overrode the answer-option flex layout,
and the general input minimum height enlarged radio controls. More specific
answer-option selectors now keep radios beside their labels with a 2.75rem
minimum label hit area. The corrected layout was visually inspected.

## Observed results

- Empty submission: native required-radio validation and focus; no action call.
- Keyboard selection: Space/arrow/Tab selected Green and Circle, count two.
- Pending submission: disabled radios and disabled Submitting answers button.
- Two separate manual failed submissions: both selections retained, count
  consistent, sanitized error summary focused after each identical failure.
- Third manual submission: mocked confirmation, disabled controls and result link.
- Start fixture: pending button, then sanitized prerequisite error with focused
  summary and course recovery link.

Frozen installation, formatting, lint, TypeScript, all 27 application tests and
production build passed locally. No local PostgreSQL client is available; the
full database/restore and HTTP header gates run in CI for the pushed commit.
Exact CI and Preview identifiers are recorded in the task output checkpoint.

This verifies local UI behavior with deterministic fake callbacks. It does not
establish hosted Auth/PostgREST behavior, real saved scoring, a screen-reader
audit, cross-browser coverage or approval of any instructor content. No hosted
record was mutated and no instructor workbook was changed.

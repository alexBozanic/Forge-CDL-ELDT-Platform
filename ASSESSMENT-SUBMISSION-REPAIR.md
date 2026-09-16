# Assessment submission reliability

The student attempt form previously threw raw RPC failures into the route error
boundary. It now uses controlled radio inputs and action state so selected
answers remain on the page after a submission RPC failure. Pending submission
disables answer editing and repeat submission. Errors receive focus, identify
questions needing attention, and link to a read-only attempt-status view in a
new tab. Leaving or reloading still discards unsaved choices; the page says so.
The deadline is displayed in UTC, and the database remains authoritative for
expiry and scoring. No client timer extends the attempt.

Before submitting, the server reads the caller-authorized attempt. It rejects
missing, duplicate, foreign-option and extra-question answers without a write.
A previously saved terminal result is returned without submitting again. An
uncertain or failed mutation gets a fixed public message, not database details,
and is never automatically retried. Scoring, private keys, published content,
RLS, authentication, attempt locks and migration files are unchanged.

## Verification

- Frozen install with the repository's pnpm 10.28.1 passed.
- Formatting, lint and TypeScript passed.
- All 23 application tests passed, including eight new cases for invalid
  context, unavailable/mismatched attempts, missing/duplicate/foreign answers,
  extra questions, returned/thrown failures, failed reads, successful terminal
  outcomes, and already-saved submissions without another write.
- The offline migration-bundle refusal tests passed.
- Local PostgreSQL execution stopped before connecting: `psql` is unavailable.
  CI must supply the real PostgreSQL integration and disposable restore gates.
- Build, production HTTP smoke and CI results are recorded in the continuation
  checkpoint once their runs finish.

The tests above exercise the submission controller, not live Auth/PostgREST
isolation or interactive browser behavior. A keyboard/screen-reader walkthrough
and simulated submission failure on an appropriate active fake enrollment are
still needed to verify radio preservation, focus, pending state and result
refresh in the browser. Do not reset a completed hosted enrollment for this.

## Content review in parallel

The user received a new 120-question Class A draft workbook and states their
instructor will begin reviewing it. All 120 entries started pending review.
The workbook is a task output, not application curriculum or a published bank.
No approval, import, real training eligibility or coverage sufficiency is implied.

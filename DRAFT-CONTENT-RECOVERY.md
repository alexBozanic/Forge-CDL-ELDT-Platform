# Module and lesson draft recovery

Module/lesson add and save actions previously threw RPC errors through ordinary
forms. Their numeric checks relied on HTML attributes and Number conversion.
These four actions now return sanitized validation/failure/success state through
a shared helper and client form. UUIDs, required title/body, positive integer
positions and 1–240 estimated minutes are validated before requesting a mutation.

The platform administrator check and authenticated database RPCs are unchanged.
Draft-only enforcement, authoring authorization and manifest refresh remain in
the existing database functions. No automatic retry, schema change, content
population or publication is added. Revalidation occurs only after confirmed
success. Returned failures never contain raw RPC details.

The form disables its fieldset while pending, reports Saving draft change,
focuses the error summary, and prevents native reset so typed entries survive.
Entries also remain after success; the success message asks the author to review
the updated content before another change. An uncertain mutation explicitly
instructs the author to inspect the draft before any manual repeat.

Three application tests cover invalid identifiers/fields/numbers, exact payloads
for all four operations, and RPC/transport failures without retries or FormData
mutation. All 33 application tests, frozen install, formatting, lint, TypeScript
and production build passed locally. CI provides database/restore/header gates.

The local browser fixture copied the actual form/helper/style files unchanged.
Edited title and Markdown values survived a delayed fake failure; all fields and
the button were disabled while pending, then restored with the sanitized error
focused. The screenshot confirmed readable layout and retained values. This is
local fake-callback evidence, not a hosted authoring write or screen-reader audit.

The settings follow-up extends the same browser-verified form wrapper to version
metadata and assessment creation. Three additional tests (36 application tests
total) check required descriptions, titles, numeric ranges, a chosen lesson for
quizzes, and the existing final-exam minimum pass percent of 80. Exact quiz/final
RPC payloads, failure sanitization and non-mutation of inputs are covered. These
validation checks supplement the existing database constraints; they do not alter
assessment policy or publish content.

Remaining raw-action paths include course creation/revision and publication/review
controls, school administration and reporting.
They require their own validation and recovery review; this checkpoint does not
claim that every mutation form has been hardened.

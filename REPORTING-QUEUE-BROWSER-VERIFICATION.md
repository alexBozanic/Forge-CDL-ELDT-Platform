# Reporting queue browser verification

Verified locally on 2026-09-16 against the unchanged reporting page and loader
from f242ff9. The fixture substitutes in-memory authorization/query results and
write-disabled actions. No Supabase client, environment credentials or hosted
data are used. It generates source hashes for the copied files.

Run `node scripts/prepare-reporting-browser-fixture.mjs ABSOLUTE_NEW_DIRECTORY`
with a new directory outside the checkout, then run the generated Next fixture
on localhost using the existing dependency junction. Open
`/schools/fake-school/reporting`. The fixture has 11 fake records with identical
microsecond timestamps and an intentionally small four-row API cap.

Observed in the Codex browser:

- Initial page showed synthetic courses 10, 9, 8 and 7.
- Older records showed 6, 5, 4 and 3.
- Enter on the focused Older records link showed 2, 1 and 0.
- Enter again showed No older records, no continuation link and a Newest link.
- Newest records returned to 10 through 7.
- A malformed before cursor showed the safe 404 page.

No records were omitted or repeated during that traversal. The successful tab
was closed and the fixture server stopped. This is browser rendering/navigation
evidence, not hosted RLS/JWT/PostgREST, screen-reader, PDF, or mutation evidence.

See FIRST-SCHOOL-PILOT.md for practical first-school entry and acceptance gates.

Fixture generation and script syntax checks passed. Frozen install, formatting,
lint, TypeScript, production build and protected-file checks passed. Application
logic is unchanged; the existing 71-test suite and database/restore/security
gates run again in CI for the pushed checkpoint.

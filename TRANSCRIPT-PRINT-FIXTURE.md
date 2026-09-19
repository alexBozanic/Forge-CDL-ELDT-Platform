# Long transcript fixture and open PDF gate

Run `node scripts/prepare-transcript-print-fixture.mjs /absolute/new/directory`
after the frozen dependency installation. The existing parent must be outside
the repository. Open the generated index.html using a local static server.

The script evaluates the unchanged transcript page using only explicit synthetic
read adapters. It includes the actual stylesheet and UTC date formatter and
records their source hashes. No production authorization/database module,
environment file, hosted read/write or instructor content is used.

The fixture contains 60 lessons, 30 assessment attempts, 20 append-only correction
entries and 20 reporting events. All numbered entries appeared in the local
browser accessibility tree on September 16, 2026 UTC. This verifies rendering of
the long record, not printing or screen-reader usability.

The available in-app browser control did not expose a print dialog after Ctrl+P;
the accessibility tree and screenshot remained on the normal page. Native print
automation is not available through that browser API. No PDF was generated, and
no pagination fix or successful PDF verification is claimed.

Remaining acceptance: export using the target browser's Save as PDF, inspect
every page for clipped/split rows, missing sections, repeated table headings and
long identifier wrapping, and extract text to confirm all numbered entries are
present. Check Letter and A4 plus the intended assistive technology. The supplied
earlier short transcript PDF does not close this long-record gate.

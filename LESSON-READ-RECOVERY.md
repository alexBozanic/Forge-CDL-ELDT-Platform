# Lesson read failure recovery

The lesson page previously ignored errors from the lesson, manifest and saved
progress queries. In particular, a failed progress read displayed "not started"
and mounted interaction controls that record an opened event automatically.

The page now rejects failed reads before rendering those controls, using a stable
error without private database details. A successful empty progress result still
allows a first visit. Existing completed status and resume points remain visible.
The school error screen now asks the learner to check the current status before
repeating a save, rather than claiming that no data changed after an unknown error.

Three regressions execute the actual lesson page with synthetic read adapters:
each failed query blocks rendering, an empty progress record permits a first
visit, and saved progress remains visible. These are local render tests, not
hosted outage or assistive-technology evidence. No SQL, policies or mutations were
changed. All 77 application tests and the offline migration-bundle check pass.
Local PostgreSQL execution is unavailable because psql is absent; the existing
CI database and disposable restore jobs remain required for this checkpoint.
Frozen install, formatting, lint, TypeScript, production build and local
production HTTP security-header checks also pass. AGENTS, the frozen lockfile and
all migration/release SQL remain unchanged.

## Staff rehearsal evidence

At checkpoint 10eca434cb8f0a23207c9eb06bc8073f429f15b3, CI 35153968466 and
Preview 7hTzuzueVsEAdCV3t5uTPWJGAyQE passed. The authorized Taylor's staff
rehearsal used the existing Forge Demo workspace and a synthetic learner.
Lesson prerequisite enforcement, saved resume point, lesson completion, final
assessment pass, immutable completion and administrator transcript were observed.
The supplied CSV has both expected ready records. Both pages of the supplied
short transcript PDF were rendered and visually checked without clipping.

This closes the short rehearsal export check, not long-record PDF pagination or
PDF accessibility: text extraction from the supplied PDF returned empty. The
independent instructor workbook remains untouched and its approval is pending.
Hosted two-school API isolation, account lifecycle and recovery/operations checks,
migration 009 for new review/publication, and real-student release remain open.

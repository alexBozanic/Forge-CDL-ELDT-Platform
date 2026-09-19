# Reporting work-queue pagination

The school reporting page previously fetched one unbounded API page, leaving
older records inaccessible after the API cap. It now requests at most 50 records
ordered newest first by creation timestamp and ID, with Older records and Newest
records navigation. Empty continuation pages say No older records instead of
implying the school has no completions. The CSV remains a separate full export.

The cursor preserves PostgreSQL microseconds and validates its timestamp and UUID
before constructing the filter. Every page retains the authenticated organization
filter and existing role/RLS checks. A cursor is a position, never authorization.
Nonempty short pages still offer continuation so a smaller project API cap does
not hide the remaining queue. There may be a final empty page. Referenced course
metadata is paginated too; missing metadata fails instead of showing incomplete
details. Mutation forms and immutable historical data are unchanged.

Three synthetic regressions cover timestamp ties, microsecond preservation,
malformed/filter-injection inputs, 125 records under a seven-row API cap, another
school's exclusion, a new insertion between page reads, API failure and an empty
queue. These are query-builder tests, not hosted JWT/PostgREST proof or interactive
browser evidence. Existing database isolation tests remain the database authority.

Pagination is a live view, not an atomic snapshot. Newly inserted newer records
appear when returning to Newest records. Concurrent corrections can change shown
statuses. Embedded status history remains subject to the existing API relationship
limits; this change does not claim to paginate every event in a record's history.

No hosted writes, migrations, dependency changes or instructor-bank edits occurred.

Local frozen install, format, lint, TypeScript, all 71 application tests and
production build passed. Protected-file and diff checks passed. Database and
restore verification runs in CI; no disposable PostgreSQL is running locally.

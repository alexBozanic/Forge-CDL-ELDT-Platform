# Reporting export pagination

The CSV endpoint previously read one API page and could silently omit records.
It now follows an ordered ID cursor, scopes every reporting page to the authorized
school, and paginates batches of referenced course metadata. Short pages do not
signal completion because the project may impose a smaller API row limit.
Supabase documents the configurable default 1,000-row limit in its
[select reference](https://supabase.com/docs/reference/python/select).

Downloads are bounded at 10,000 records. A failed page, nonadvancing cursor,
missing referenced course metadata, or exceeded limit returns a sanitized error
and no partial CSV. The reporting page explains this limit. Existing authorization,
RLS, CSV escaping and private/no-store response headers remain in place.

A creation-time cutoff is captured once. This limits new records entering the
scan but is not a transactional database snapshot: concurrent status changes or
backdated inserts can still affect results. The separate reporting work queue
still needs pagination; this change concerns the download endpoint only.

Five synthetic application tests cover 1,201 records with an API cap of 37,
mid-download transport/API failures, stalled/unordered cursors, empty exports,
the 10,000-record bound, tenant/cutoff filters on every page, 205 referenced
versions in bounded batches, and missing metadata. These mocks do not establish
hosted RLS isolation; the two-school hosted JWT/PostgREST check remains pending.

Local verification passed: frozen install, formatting, ESLint, TypeScript, all
68 application tests, production build, offline migration-bundle refusal tests,
and diff/protected-file checks. The initial ESLint process stalled and was stopped;
the direct ESLint invocation completed successfully. PostgreSQL/restore checks
run in CI because this workstation has no running disposable database.

No hosted data was read or changed for this repair. No migrations, lockfile,
dependencies, instructor material or published curriculum were changed.

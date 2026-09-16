# Reporting CSV formula-prefix coverage

The export already quoted every field, escaped embedded quotes, and prefixed
common formula markers with an apostrophe. It missed leading line feed and
full-width formula markers. reportingCsvCell now also handles those cases and
formula markers preceded by whitespace/control characters. Ordinary text,
numbers, dates and empty cells retain their existing serialization.

Three regressions cover formula/control/locale prefixes, delimiter and quote
breakout attempts, embedded newlines and ordinary reporting values. The route
uses the tested helper for headers and rows. Its authenticated role/membership
checks, tenant filter, RLS client and private/no-store headers are unchanged.
No CSV was fetched from a hosted school or imported into a live spreadsheet.

Reference: [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection).
This strengthens the existing text-escaping strategy. Spreadsheet applications
and re-save/import behavior differ; it is not a universal guarantee that an
edited and re-saved CSV remains inert. Actual spreadsheet interoperability and
hosted export authorization remain separate acceptance checks.

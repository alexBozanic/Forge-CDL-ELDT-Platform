# Security model

## Trust boundaries

- Authentication establishes a user ID; database grants establish roles and tenant membership.
- Browser-supplied IDs, JWT metadata, hidden fields, and route parameters are untrusted.
- RLS and relational constraints independently enforce isolation if a route handler is defective.
- The service-role key bypasses RLS and must never enter source control, logs, browser bundles, or routine request clients.

## Current controls

- RLS is enabled and forced on every application table.
- Public and anonymous access is denied by grants and policies.
- Tenant relationships use composite keys.
- No authenticated write path exists for organization memberships or platform administrators.
- Security-definer helpers use a fixed empty search path and schema-qualified names.
- Audit history is update/delete-denied to application roles.
- Development data is obviously fake and contains no SSNs or live credentials.

## Required future controls

- Invitation tokens: store a hash only; high entropy, expiry, single use, tenant/email/role/version binding, and atomic acceptance.
- Curriculum: enrollment-pinned student reads; exact manifest reviews; draft-change review invalidation; protected-schema answer keys.
- Assessments: server selection and grading; required blueprint coverage; persisted option ordering; idempotency keys and row locks; exact integer threshold comparisons.
- Completion: transactional prerequisite checks and unique completion; immutable reporting identity/provider snapshots; append-only corrections.
- Reporting: distinct ready/submitted/accepted/needs-attention/rejected/corrected events; no inferred acceptance; tenant-safe exports and CSV formula neutralization.
- Storage: private buckets, tenant-aware authorization, short-lived signed URLs, restricted content types and sizes.
- Operations: secret scanning, dependency review, rate limits, PII redaction, backups, restore exercises, retention rules, and audited school export.

## Sessions

Authentication implementation is intentionally deferred. Before adding it, verify the current official Supabase Next.js SSR guidance and supported cookie behavior. Use supported `@supabase/ssr` clients and server-side validation; do not invent an HTTP-only-token architecture that the standard client cannot refresh. Official documentation access was blocked during this foundation build, so this remains an explicit precondition.

## Testing standard

Tenant isolation requires real PostgreSQL tests using separate `anon` and `authenticated` identities with realistic `auth.uid()` values. Unit mocks do not count. Hosted Supabase Auth/API behavior remains unverified until tested against a Supabase local stack or isolated hosted test project.

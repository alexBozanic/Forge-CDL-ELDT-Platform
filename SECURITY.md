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
- Authenticated roles have no direct table-write path for memberships or platform administrators; membership creation is limited to invitation acceptance, and platform grants require the controlled bootstrap.
- Security-definer helpers use a fixed empty search path and schema-qualified names.
- Audit history is update/delete-denied to application roles.
- Development data is obviously fake and contains no SSNs or live credentials.
- Student profile reads and writes require an active tenant-matched membership; suspended and removed memberships no longer authorize profile access.

## Phase 2 controls

- Supabase SSR clients use the installed SDK's bulk cookie adapter; middleware refreshes through `auth.getUser()`, and every protected server render validates the user again.
- Platform and tenant roles come only from RLS-protected database tables. Application code contains no service-role client and no client-supplied role authorization.
- Invitation tokens have 256 bits of server-generated entropy, are persisted only as SHA-256 hashes, expire within 30 days, are revocable and single-use, and are bound to a normalized Auth email, tenant, student role, and optional tenant assignment.
- Invitation acceptance locks its row and atomically creates authority, optional enrollment, transition, and audit rows. Suspended/removed memberships cannot use an invitation to reactivate themselves, and acceptance does not invent or collect legal-profile data.
- Enrollments require active tenant-matched students and assignments, pin the assignment's published immutable course version, use a tenant composite key, and are idempotent per student/assignment.
- Signup grants no application role. Confirmation and recovery use Supabase APIs, fixed internal callback destinations, generic account-disclosure-resistant responses, and server actions protected by Next.js origin checks.
- Acceptance rechecks that the issuing platform/school administrator and organization are still active. A private per-user 15-minute redemption counter limits authenticated guessing without storing guesses; deployment-level IP/risk rate limiting remains required.
- The first platform administrator is established only by a one-time, confirmed-user, trusted-database script that refuses an existing installation and writes an audit event. Only platform administrators can invite school administrators.

## Required future controls

- Operations: configure Auth abuse protection and edge/IP rate limits, monitor invitation failures, and rehearse account recovery.
- Curriculum: enrollment-pinned student reads; exact manifest reviews; draft-change review invalidation; protected-schema answer keys.
- Assessments: server selection and grading; required blueprint coverage; persisted option ordering; idempotency keys and row locks; exact integer threshold comparisons.
- Completion: transactional prerequisite checks and unique completion; immutable reporting identity/provider snapshots; append-only corrections.
- Reporting: distinct ready/submitted/accepted/needs-attention/rejected/corrected events; no inferred acceptance; tenant-safe exports and CSV formula neutralization.
- Storage: private buckets, tenant-aware authorization, short-lived signed URLs, restricted content types and sizes.
- Operations: secret scanning, dependency review, rate limits, PII redaction, backups, restore exercises, retention rules, and audited school export.

## Sessions

The implementation follows the locally installed `@supabase/ssr` source and type declarations rather than inventing an authentication API. Public project coordinates are the only browser-safe configuration. Online official documentation remained unavailable, and neither a local Supabase CLI nor a hosted test project was available; therefore Auth password flows, JWT issuance/refresh, cookie flags, PostgREST RPC exposure, and email verification still require end-to-end confirmation before a real pilot.

## Testing standard

Tenant isolation requires real PostgreSQL tests using separate `anon` and `authenticated` identities with realistic `auth.uid()` values. Unit mocks do not count. Hosted Supabase Auth/API behavior remains unverified until tested against a Supabase local stack or isolated hosted test project.

The PostgreSQL integration suite also covers cross-school writes, attempts by a school administrator to grant platform-administrator access, and access after membership suspension/removal. This is PostgreSQL policy and constraint evidence, not evidence about Supabase Auth, JWT issuance, or PostgREST configuration.

Phase 2 PostgreSQL tests cover school-creation authorization; school-admin assignment boundaries; signup-without-membership; stale issuer authority; authenticated guessing limits; cross-tenant assignments; wrong-email, unverified-email, expired, revoked, replayed, and suspended-member invitation attempts; atomic enrollment creation; idempotency; version pinning; draft-version rejection; and audit/transition creation. The shell suite also runs two actual concurrent PostgreSQL sessions against one invitation and asserts one membership and audit event. Concurrent PostgREST requests remain part of Supabase end-to-end verification.

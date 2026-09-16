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
- Application responses deny framing through CSP `frame-ancestors` and the legacy
  frame header, disable MIME sniffing, limit referrer detail, and deny unused
  camera, geolocation, microphone, payment, and USB browser capabilities.
- Runtime dependencies pin current stable Next.js and `eslint-config-next` at
  16.3.5 and React/React DOM at 19.3.0. The resolved lockfile passes frozen
  installation, production audit with no high findings, and local production checks.

## Phase 2 controls

- Supabase SSR clients use the installed SDK's bulk cookie adapter; middleware refreshes through `auth.getUser()`, and every protected server render validates the user again.
- Platform and tenant roles come only from RLS-protected database tables. Application code contains no service-role client and no client-supplied role authorization.
- Invitation tokens have 256 bits of server-generated entropy, are persisted only as SHA-256 hashes, expire within 30 days, are revocable and single-use, and are bound to a normalized Auth email, tenant, student role, and optional tenant assignment.
- Invitation acceptance locks its row and atomically creates authority, optional enrollment, transition, and audit rows. Suspended/removed memberships cannot use an invitation to reactivate themselves, and acceptance does not invent or collect legal-profile data.
- Enrollments require active tenant-matched students and assignments, pin the assignment's published immutable course version, use a tenant composite key, and are idempotent per student/assignment.
- Signup grants no application role. Confirmation and recovery use Supabase APIs, fixed internal callback destinations, generic account-disclosure-resistant responses, and server actions protected by Next.js origin checks.
- Acceptance rechecks that the issuing platform/school administrator and organization are still active. A private per-user 15-minute redemption counter limits authenticated guessing without storing guesses; deployment-level IP/risk rate limiting remains required.
- The private redemption counter has RLS enabled with no client policy and retains explicit grant revocation. Only the narrow owner-executed invitation function accesses it; PostgreSQL regression tests exercise redemption and concurrency with this protection enabled.
- The first platform administrator is established only by a one-time, confirmed-user, trusted-database script that refuses an existing installation and writes an audit event. Only platform administrators can invite school administrators.

## Course delivery controls

- Master authoring RPCs are platform-only. School administrators can assign existing published versions within their tenant but cannot edit curriculum.
- Canonical manifests include ordered modules, ordered lessons, version metadata, lesson bodies, and delivery metadata. Draft changes rotate the hash and stale prior exact-hash approvals.
- Publication requires a current approval for both demo and non-demo content. Review records explicitly are not regulatory or instructor certification.
- Database triggers deny update/delete of published content, ordering, manifest membership, version metadata, reviews, and interaction history. Retirement and assignment withdrawal are separate reasoned metadata transitions.
- Demo publication requires an active explicitly demo-classified school, and demo assignment requires that target classification at both RPC and trigger layers; classification changes cannot convert an existing assigned relationship.
- Student reads and writes require an active membership, own active enrollment, exact pinned version, and manifest lesson. Composite keys protect progress/event tenant, student, enrollment, version, and lesson relationships.
- Lesson interaction requests are idempotent. Open, resume, and completion-interaction timestamps are navigation evidence only and create no course completion, certification, assessment result, report, or TPR event.

## Required future controls

- Operations: configure Auth abuse protection and edge/IP rate limits, monitor invitation failures, and rehearse account recovery.
- Curriculum governance: define and verify formal reviewer qualifications and theory-unit blueprint content. Existing review records are software workflow evidence only.
- Assessments use private RLS-protected answer keys and attempt payloads, server selection/grading, exact persisted option order, row locks, and integer threshold comparisons. Students cannot select their score or read submitted final payloads.
- Browser roles cannot select submitted assessment-answer rows. Administrators
  receive aggregate attempt outcomes and tenant-authorized transcripts instead,
  preventing answer selections and correctness flags from becoming an indirect
  answer-key channel.
- Completion checks pinned lesson prerequisites and a passing final in one idempotent transaction, then freezes identity/provider/course/attempt snapshots. Corrections append records instead of rewriting history.
- Reporting keeps needs-attention, ready, submitted, accepted, and rejected distinct, requires actor/time/reason events, performs no FMCSA call, and neutralizes spreadsheet formulas in tenant-scoped CSV exports.
- Storage: private buckets, tenant-aware authorization, short-lived signed URLs, restricted content types and sizes.
- Operations: secret scanning, dependency review, rate limits, PII redaction, backups, restore exercises, retention rules, and audited school export.

## Sessions

The implementation follows the locally installed `@supabase/ssr` source and type declarations rather than inventing an authentication API. Public project coordinates are the only browser-safe configuration. The hosted disposable schema has now been inspected, but the project has no Auth users or completed Auth/PostgREST flow. Auth password flows, JWT issuance/refresh, cookie flags, PostgREST RPC exposure, and email verification still require end-to-end confirmation with confirmed fake identities and a non-delivering inbox before a real pilot.

## Testing standard

Tenant isolation requires real PostgreSQL tests using separate `anon` and `authenticated` identities with realistic `auth.uid()` values. Unit mocks do not count. Hosted Supabase Auth/API behavior remains unverified until tested against a Supabase local stack or isolated hosted test project.

The PostgreSQL integration suite also covers cross-school writes, attempts by a school administrator to grant platform-administrator access, and access after membership suspension/removal. This is PostgreSQL policy and constraint evidence, not evidence about Supabase Auth, JWT issuance, or PostgREST configuration.

Phase 2 PostgreSQL tests cover school-creation authorization; school-admin assignment boundaries; signup-without-membership; stale issuer authority; authenticated guessing limits; cross-tenant assignments; wrong-email, unverified-email, expired, revoked, replayed, and suspended-member invitation attempts; atomic enrollment creation; idempotency; version pinning; draft-version rejection; and audit/transition creation. The shell suite also runs two actual concurrent PostgreSQL sessions against one invitation and asserts one membership and audit event. Concurrent PostgREST requests remain part of Supabase end-to-end verification.

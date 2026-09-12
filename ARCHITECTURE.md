# Architecture

## Purpose and boundaries

Forge is a multi-tenant software platform for independent CDL schools. A school remains the training provider of record and manually submits completion information to the Training Provider Registry (TPR). The platform must not imply that software readiness establishes curriculum approval, provider eligibility, state eligibility, or authorization to train real students.

The first milestone is a fake-data software pilot for one school followed by a second school that proves isolation.

## Modular monolith

One Next.js application and one Supabase PostgreSQL database form a modular monolith. Product modules will cover identity, organizations, invitations, students, curriculum, enrollments, learning, assessments, completions, reporting, and audit. Module boundaries live in application code; they are not independently deployed services.

Browser code receives the public Supabase project coordinates only. Normal data requests use the signed-in user's session so Row Level Security (RLS) remains active. Privileged work uses narrow server-side commands or restricted database functions rather than a general service-role client. A service-role key, when eventually needed, remains server-only and its use is isolated and audited because it bypasses RLS.

## Identity and tenancy

Supabase Auth owns authentication identity. `public.platform_administrators` grants the global platform role. `public.organization_memberships` grants organization-scoped `school_admin` or `student` roles. Users cannot create or elevate their own memberships.

Every tenant-owned row carries `organization_id`. Tenant-owned references use composite foreign keys containing `organization_id`, so application bugs cannot connect a School A record to School B. Request-supplied organization IDs select context but never establish authorization.

## Historical truth

An enrollment will be pinned to one published course version. Publication creates a canonical content manifest. Published lesson and assessment content is immutable. Retirement is a separate metadata transition and never changes published instructional content.

Draft changes invalidate prior review. Review and approval records point to the exact manifest they evaluated. Assessment blueprints explicitly require theory-unit coverage; random selection must satisfy that blueprint. Coverage is a content-design and review control, not a claim of regulatory compliance.

At completion, a transaction captures immutable snapshots of the student's reporting identity, the school's provider identity, the course manifest, and the qualifying attempt. Later profile or organization edits do not rewrite a transcript. Corrections are append-only and include the prior/corrected value, reason, actor, and timestamp.

TPR readiness, submission, confirmed acceptance, rejection/needs-attention, and correction are distinct explicit events. Submission never implies acceptance. The system does not submit automatically in the MVP.

Student curriculum access will require an authorized enrollment and exactly its pinned version. Publication status alone is never sufficient. Student-readable question content and protected answer keys live in separate tables/schemas; browser clients cannot read the protected schema.

The implemented lesson-delivery slice stores version metadata, ordered modules, lesson text, and a canonical JSON manifest/hash on the course version. Reviews record the exact draft hash they saw; any draft mutation recomputes the hash, making prior approvals stale. Publication materializes ordered manifest membership and database triggers prevent later content, order, manifest, review, or version-metadata rewrites. Retirement and assignment withdrawal are separate one-way metadata changes and do not rewrite enrollment pins.

Lesson access is derived from an active student membership plus an active enrollment pinned to the lesson's published manifest. Open, resume-position, and lesson-interaction-complete events are server-authorized and append-only; the mutable progress row is only a current projection. These interactions are not evidence of attention and cannot produce course completion, certification, assessment results, reporting readiness, or a TPR event.

## Session architecture decision

Authentication uses the installed `@supabase/ssr` 0.6.1 `createServerClient` API with its current `getAll`/`setAll` cookie adapter. Next.js middleware calls `auth.getUser()` and copies refreshed cookies to both the request and response. Server-rendered authorization independently calls `auth.getUser()` and loads platform/membership grants from RLS-protected database rows; it never trusts cookie payloads, user metadata, route parameters, or client role claims. Server actions that establish or clear a session use a cookie-writable client, while render-only clients leave refresh writes to middleware.

No service-role client exists in the application. Organization, invitation, and enrollment mutations go through narrowly granted, authorization-checking database functions under the caller's authenticated session. Official online Supabase guidance was unavailable, so the implementation was checked against the installed package source and declarations; local or hosted Supabase Auth/JWT/PostgREST verification remains required before a real pilot.

## User experience

The student experience is mobile-first, keyboard accessible, high contrast, and centered on the next required lesson. Administration prioritizes invitations, assignments, student records, completion review, and reporting work—not decorative metrics. All routes require purposeful loading, empty, validation, and error states.

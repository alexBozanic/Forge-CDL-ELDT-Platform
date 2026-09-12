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

## Session architecture decision

The implementation will follow the supported `@supabase/ssr` Next.js pattern: browser and server clients use the framework cookie adapter, and server-side token refresh updates cookies through supported middleware/proxy handling. Authorization always calls a server-validated user operation rather than trusting cookie contents alone. We do **not** claim that Supabase tokens can be placed exclusively in HTTP-only cookies: the current official documentation could not be reached from this environment, so cookie flags and the exact supported refresh API must be revalidated against official Supabase documentation before authentication is implemented.

## User experience

The student experience is mobile-first, keyboard accessible, high contrast, and centered on the next required lesson. Administration prioritizes invitations, assignments, student records, completion review, and reporting work—not decorative metrics. All routes require purposeful loading, empty, validation, and error states.

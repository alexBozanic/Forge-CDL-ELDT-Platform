# Database design

## Current foundation

The first migration creates:

- `organizations`: tenant identity and non-sensitive branding/contact metadata.
- `platform_administrators`: global privilege grants, separate from tenant memberships.
- `organization_memberships`: tenant-bound `school_admin` and `student` roles.
- `student_profiles`: tenant-bound identity fields with a composite membership foreign key.
- `audit_events`: minimal append-only security and administrative history.
- `private`: non-API schema for authorization helpers and, later, answer keys.

UUIDs identify records but do not authorize access. Memberships and profiles use `(organization_id, user_id)` keys. The profile-to-membership composite foreign key prevents cross-tenant relationships. Partial and composite indexes support user membership checks and tenant lists.

## Authorization

All public tables enable and force RLS. Grants are revoked from `public` and `anon`; `authenticated` receives only the minimum table privileges that RLS can further constrain. Membership and platform-role writes have no client policy. Active school administrators can read records in their school; active students can read their own organization and profile. A user can still read their own membership row so its lifecycle state can be determined, but suspended and removed memberships authorize no tenant or profile access. Active students may update limited fields on their own profile, while database triggers prevent tenant/user key changes.

Authorization predicates are `SECURITY DEFINER` functions in the non-exposed `private` schema. Each has an empty, fixed `search_path`, schema-qualified names, stable volatility where valid, and execute privileges only for authenticated application users. Functions rely on `auth.uid()` and stored grants, never role data supplied by a client. A protected trigger additionally requires every student profile to reference a tenant-matched membership whose role is actually `student`.

Audit rows can be inserted only through the non-public `private.write_audit_event` building block, which verifies either a platform administrator or an active membership for the target tenant. It is intentionally not executable directly by application roles; future controlled command functions can call it. Application roles cannot update or delete audit rows. Database owners and service-role operators remain technically capable of changing them, so this is append-only for application roles rather than absolutely immutable.

## Phase 2 records

The second migration adds minimal demo `courses` and immutable `course_versions`, tenant `course_assignments`, hashed invitations, version-pinned enrollments, and append-only enrollment transition events. Assignments accept only published versions; composite foreign keys prevent assignment and enrollment rows from crossing tenant boundaries. Published version identity/manifest fields cannot change, and retirement is one-way metadata. This is only the data integrity needed for this phase—not approved curriculum or an assessment engine.

Raw invitation tokens never enter the database. A server action generates 256 bits of randomness, sends only its SHA-256 hash to a narrow database function, and exposes the raw token once through the local fake-delivery UI. Acceptance locks the matching invitation, derives the confirmed authenticated email from `auth.users`, rejects expiry/revocation/replay and suspended/removed memberships, then atomically creates membership, optional pinned enrollment, transition history, and audit history. It does not invent legal-profile values. Authenticated roles cannot select the hash column.

Organization, settings, invitation, revocation, acceptance, and enrollment commands are public-schema RPC functions because PostgREST exposes the API schema, but their execution is narrowly granted and each function reauthorizes with `auth.uid()` plus stored database grants. Internal predicate/audit functions remain in the non-exposed `private` schema.

The third migration adds platform-only school-administrator invitations, current-issuer authorization checks, and a private per-authenticated-user redemption window. Invalid redemption attempts return the same null result so failed attempts can commit their rate-limit counter without revealing whether a token, email, or invitation state matched. Successful acceptance still locks the invitation and performs authority/enrollment/audit changes in one transaction. Edge/IP abuse controls are deliberately an operational layer rather than a database substitute.

## Versioned lesson delivery

The fourth migration adds ordered `course_modules` and `course_lessons`, materialized `course_version_manifest_lessons`, exact-hash `curriculum_reviews`, tenant-bound `lesson_progress`, and append-only `lesson_interaction_events`. The manifest includes version metadata, ordered membership, lesson text, and delivery metadata needed to reconstruct the assigned reading. Progress and event relationships contain the enrollment's organization, student, version, and lesson keys so mismatches fail independently of route code.

Only platform administrators can author master drafts. Draft edits recompute the canonical manifest and hash, so an earlier review remains historical but cannot authorize publication. All content—demo and non-demo—requires a current exact-hash approval before publishing. The review is a software content-review record only; it does not claim qualified-instructor, curriculum, regulatory, provider, or jurisdiction approval. Published and retired content, order, manifest membership, and review records reject updates/deletes. Revisions are new version rows.

Demo content can be published only when an active explicitly demo-classified school exists, and can be assigned only to such schools. The publication/assignment RPCs and database trigger enforce these gates, and classification cannot be changed while it would convert an existing demo relationship. School administrators may select existing published versions and may withdraw assignments with a reason; they cannot edit the master curriculum. Retirement and withdrawal prevent future use without changing existing enrollment pins.

Students can read modules and lessons only through their own active, pinned enrollment and its materialized manifest. `record_lesson_interaction` derives student and tenant identity from `auth.uid()`, rejects mismatched lessons/enrollments, and uses a tenant-scoped idempotency key. Progress stores actual open/resume/completion-interaction timestamps; events explicitly carry `{"interaction_only":true}` and cannot create course completion or reporting state.

## Assessments, completion, and reporting

`assessments`, `assessment_blueprint_topics`, `assessment_questions`, and `assessment_options` belong to one course version and enter its canonical hash. `private.assessment_answer_keys` has RLS enabled and no browser-role grants. Publication validates exact blueprint counts, question availability, at least two options, and one private key per question before materializing assessment membership.

`assessment_attempts` stores status, threshold, timing, counts, and immutable outcome. `private.assessment_attempt_payloads` stores the exact randomized question and option order; a narrow RPC returns it only to the owning active student while the attempt is open. `assessment_answers` is append-only and stores the server-derived correctness result. Grading compares `correct * 100 >= threshold * total`; a final cannot configure a threshold below 80.

`course_completions` is unique per tenant enrollment and snapshots identity, provider, manifest hash, and qualifying attempt. `reporting_records` is the mutable current queue projection while `reporting_events` and `completion_corrections` are append-only history. Required reporting fields are never synthesized. Manual submission and external acceptance/rejection are separate transitions.

## Planned immutable records

Later curriculum/completion migrations will add formal review workflow/qualification records, theory-unit coverage blueprints, protected answer keys, assessment attempt snapshots, completion reporting-identity/provider snapshots, append-only corrections, and distinct TPR event states. These requirements are architectural constraints, not placeholders that may be weakened for development.

## Migration workflow

```bash
supabase start
supabase db reset
pnpm test:db
```

`supabase db reset` applies migrations from an empty local database and then runs `supabase/seed.sql`. `scripts/test-database.sh` also accepts `DATABASE_URL` and executes the integration SQL directly with `psql`. The test database must provide Supabase's `auth.uid()` function and `anon`/`authenticated` roles; the script's bootstrap supplies faithful local equivalents for plain PostgreSQL.

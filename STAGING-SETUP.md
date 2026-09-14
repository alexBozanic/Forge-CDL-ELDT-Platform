# Disposable Supabase staging verification

This procedure is required to validate behavior that plain PostgreSQL tests cannot cover. Use a disposable local or hosted Supabase project containing only `.example.invalid` identities and demonstration content. Do not use a production project, real student records, or a real email delivery provider.

## Current hosted test-project state

The 001-003 provenance remains: the test project `uooiziwxmuzdbdcxblox` at
`https://uooiziwxmuzdbdcxblox.supabase.co` has migrations `202609120001`,
`202609120002`, and `202609120003` manually applied from saved commit
`9f435699642b38454c11b96f84f90b7a1f7cf65c` through SQL Editor. The editor's
**Run and enable RLS** option also enabled RLS on
`private.invitation_redemption_limits`. No seed, Auth user, membership, sample
record, application public-key configuration, or hosted Auth/PostgREST test had
been applied at that checkpoint.

**Operator-reported evidence, 2026-09-13:** with explicit user approval, an
authenticated operator applied the exact migrations 004-007 from release commit
`7a56c600511d74cc4cadbe5365612d972dc681bd` individually through the Supabase SQL
Editor; each returned `Success`. A fresh read-only query then reported all 28
public and all 3 private application tables with RLS enabled, the transcript RPC
present, anonymous execution denied, authenticated execution allowed, and
authenticated `SELECT` on `assessment_answers` denied. It also reported zero Auth
users and zero completions. This is source-attributed hosted schema evidence, not
execution performed by this local agent and not Auth/PostgREST/browser evidence.

The `supabase_migrations.schema_migrations` table is absent because migrations
were executed manually. Do not rerun 001-007, manufacture migration history,
reset, seed, or reinterpret SQL Editor success as CLI reconciliation.

SQL Editor execution did not populate `supabase_migrations.schema_migrations`.
The repository therefore provides an inspection-only offline bundle in
`release/staging-migration-bundle`. Regenerate it with the command below; the
generator refuses changed, missing, or unexpected migrations and has no network,
database, history-repair, or push path:

```bash
pnpm test:migration-bundle
./scripts/prepare-staging-migration-bundle.sh
```

Its source manifest records the exact hashes for all seven migrations and the
hosted 001-003 provenance commit. Files 004-007 remain separate and retain their
own transaction boundaries. The bundle is evidence for review, not an executable
claim that the hosted schema matches.

### Controlled operator gates

There is intentionally no repository script that repairs migration history or
pushes this bundle. A trusted operator must complete and archive each gate before
choosing any mutation command from current official tooling documentation:

1. Open project `uooiziwxmuzdbdcxblox` in the Supabase dashboard and independently
   confirm that the connection endpoint used by the trusted SQL session belongs
   to that project. A CLI link plus an environment variable is not proof of target.
2. Run `verify-hosted-schema-read-only.sql` in that explicitly verified session.
   It begins a read-only transaction and rolls back. Review migration history,
   expected 001-003 objects, forced RLS state, and security-definer routines.
3. Compare the original SQL Editor artifacts for 001-003 with commit
   `9f435699642b38454c11b96f84f90b7a1f7cf65c` and the manifest hashes. Schema
   inspection alone cannot prove source equivalence. Stop on any uncertainty.
4. Stop. Migration-history reconciliation is a separate future operator decision;
   it is not required for preview configuration and is not authorized here. The
   already-applied migrations must not be replayed.

Never hand-insert migration-history rows, use `db reset`, rely on confirmation
environment strings, or allow an automated script to repair history and then push.

## New disposable project configuration

1. For a new empty project only, apply `supabase/migrations/*.sql` in filename order. Do **not** use this step on the partially initialized hosted project described above. Do **not** apply `supabase/seed.sql`: it is a plain-PostgreSQL development fixture that includes a preselected fake platform administrator and is not an Auth-account bootstrap.
2. Set the Auth site URL to the application origin and allow exactly these redirect URLs:
   - `http://localhost:3000/auth/confirm`
   - the corresponding HTTPS staging origin `/auth/confirm`
3. Configure signup confirmation and password recovery templates to redirect to `/auth/confirm`. The application accepts Supabase PKCE `code` callbacks and `token_hash` callbacks for `signup` and `recovery`; it accepts only fixed internal post-confirmation destinations.
4. Use Supabase's local inbox or another non-delivering test sink. Do not configure a real SMTP recipient.
5. Create four unique, confirmed `.example.invalid` Auth users for platform administrator, new school administrator, new student, and wrong-email testing. Store generated passwords only in an untracked shell environment or secret manager.
6. Bootstrap the first platform administrator exactly once from a trusted database shell:

   ```bash
   DATABASE_URL=... \
   PLATFORM_ADMIN_USER_ID=... \
   BOOTSTRAP_CONFIRM=bootstrap-first-platform-admin \
   ./scripts/bootstrap-platform-admin.sh
   ```

   The script requires an existing confirmed Auth user, refuses to run if any platform administrator already exists, and writes an audit event. It accepts no password or service-role key.

7. Sign in as that platform administrator and create two disposable non-demo schools. Do not insert memberships directly—the invitation flow under test must create them.
8. In `/platform/courses`, create a course with the **Demonstration content** box left unchecked. Add an original short module and lesson, record an exact-manifest content review that explicitly makes no regulatory claim, and publish it. This exercises the same approval gate required for non-demo content rather than bypassing publication with direct SQL.
9. Open each school workspace as the platform administrator and create an assignment from that published version. Retrieve the non-secret organization and assignment IDs with a trusted read-only query if needed:

   ```sql
   select o.id as organization_id, o.slug, a.id as assignment_id
   from public.organizations o
   join public.course_assignments a on a.organization_id = o.id
   order by o.slug, a.created_at;
   ```

## Application environment

Set these untracked variables for the Next.js application:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
```

`NEXT_PUBLIC_SITE_URL` must be an HTTPS origin in staging; HTTP is accepted only for `localhost` or `127.0.0.1`. Do not add a service-role key to the application environment.

For the exact Vercel Preview procedure, commit pinning, callbacks, and fake Auth
account prerequisites, follow `VERCEL-PREVIEW.md`.

### Current Vercel preview state

**Operator-reported evidence, 2026-09-14:** Vercel project
`forge-cdl-eldt-platform` was created in team `alexbozanics-projects` and connected
to GitHub. It detected Next.js, used Node.js 22 and frozen pnpm installation, and
has an ignore command restricting builds to `VERCEL_ENV=preview`. The first
Create Preview action was unexpectedly labeled Production and was canceled by
that guard; nothing went live. An explicitly selected Preview redeploy compiled
all routes and serverless outputs, then Vercel refused publication with
`Vulnerable version of Next.js detected, please update immediately.` No preview
was published and the block must not be bypassed.

Preview-scoped values for the public Supabase URL, browser-safe publishable key,
and `NEXT_PUBLIC_SITE_URL` were saved; no application secret was supplied. The
assigned origin is
`https://forge-cdl-eldt-platform-git-codex-a685d8-alexbozanics-projects.vercel.app`.
The Supabase Site URL and exact `/auth/confirm` redirect were saved for that
origin. Hosted migrations and data were not changed: 001-007 remain manually
applied, migration history remains absent, and Auth users remain zero. Test-inbox
and real-browser Auth workflows remain unverified.

With user-approved registry access restored on 2026-09-14, official npm registry
metadata identified current stable Next.js and matching `eslint-config-next` as
`16.3.5`, and React as `19.3.0`. A trial of the maintained Next.js 15 backport was
rejected after production audit exposed high-severity vulnerable transitive
packages; it was not committed. Dependencies were then resolved normally from
`registry.npmjs.org`: Next.js and its ESLint config are 16.3.5; React, React DOM,
and their types are 19.3.0; and plugin-compatible ESLint is 9.39.5. Next.js 16's
native flat configs replaced the legacy compatibility adapter. The lockfile was
regenerated normally, production audit reported no high findings, then a frozen
install, format, lint,
typecheck, full PostgreSQL suites, migration-bundle checks, local restore,
production build, security headers, and public/Auth-route smoke all passed. This
is local repair evidence; the Vercel Preview has not yet been retried or published.

**Operator-reported Preview evidence, 2026-09-14:** Preview deployment
`GXhUzS2rrjrMS3ssvUHwhdZu7Sha` is Ready and a platform administrator authenticated.
The application created fake school `Forge Demo CDL Academy` (`forge-demo`) and
draft version `5ddc6f56-4aad-4f3a-aed7-31d64337e71d`, containing module
`Getting started`, lesson `How this demo works`, and one-question final assessment
`9e781fa2-5b57-4d3e-ab5f-121b343144b8` (80 percent, five minutes). No blueprint
topic or question was persisted. An invalid `demo-purpose` question topic produced
a raw FK `23503` whole-page error. Adding valid topic `demo_purpose` returned a
03:10:01.669Z HTTP 500 Gateway Timeout; an earlier module add similarly timed out,
then succeeded only after the operator verified no write and manually retried.

The authoring repair validates topic syntax and positive counts before RPC,
requires choosing a server-verified existing blueprint topic for questions,
preserves submitted values on failure, shows accessible action/pending feedback,
and maps database/gateway failures to a stable message without automatic retry or
private details. Local PostgreSQL completed the topic-to-question-to-review-to-
publish RPC workflow and rejected invalid/missing topics. No deterministic SQL or
locking failure reproduced locally: `add_assessment_topic` performs one authorized
insert and draft-manifest refresh. The hosted timeout remains a transient gateway
observation, not a proven database defect, and needs one controlled Preview recheck.

## Automated Auth/PostgREST test

Prepare one active demo organization and assignment plus an assignment belonging to a second organization. The school-admin and student accounts must not already have memberships. Export the following untracked values without printing them:

```text
STAGING_SUPABASE_URL
STAGING_SUPABASE_ANON_KEY
STAGING_PLATFORM_EMAIL
STAGING_PLATFORM_PASSWORD
STAGING_SCHOOL_ADMIN_EMAIL
STAGING_SCHOOL_ADMIN_PASSWORD
STAGING_STUDENT_EMAIL
STAGING_STUDENT_PASSWORD
STAGING_WRONG_EMAIL
STAGING_WRONG_PASSWORD
STAGING_ORGANIZATION_ID
STAGING_ASSIGNMENT_ID
STAGING_SECOND_ASSIGNMENT_ID
STAGING_ASSESSMENT_ANSWERS
```

Run once against the disposable project:

```bash
node scripts/test-supabase-e2e.mjs
```

`STAGING_ASSESSMENT_ANSWERS` is an untracked JSON object mapping the staged final's selected question UUIDs to option UUIDs. Treat it as test answer-key material and never print or commit it.

The script verifies real password token issuance, confirmed Auth users, platform-to-school-admin invitation, school-admin-to-student invitation, wrong-email and replay rejection, pinned enrollment/manifest visibility through RLS, idempotent lesson interactions, prerequisite-gated server assessment start/scoring, protected-schema denial, completion/reporting visibility, cross-tenant assignment denial, invitation-hash denial, and token refresh. It never prints passwords, invitation tokens, or submitted answers. Because it consumes invitations and creates memberships, enrollment, progress, attempts, completion, and reporting state, use a fresh disposable project dataset before repeating it; do not reset the partially initialized shared test project without an explicit reviewed recovery plan.

Manually exercise `/signup`, the local confirmation message, `/auth/confirm`, `/login`, `/invitations/accept`, `/password/recover`, and `/password/update` to verify the configured email templates and browser cookie flow. Those browser/email-template checks are not performed by the Node script.

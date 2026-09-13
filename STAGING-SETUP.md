# Disposable Supabase staging verification

This procedure is required to validate behavior that plain PostgreSQL tests cannot cover. Use a disposable local or hosted Supabase project containing only `.example.invalid` identities and demonstration content. Do not use a production project, real student records, or a real email delivery provider.

## Current hosted test-project state

As of 2026-09-12, the empty test project `uooiziwxmuzdbdcxblox` at
`https://uooiziwxmuzdbdcxblox.supabase.co` has migrations `202609120001`,
`202609120002`, and `202609120003` manually applied from saved commit
`9f435699642b38454c11b96f84f90b7a1f7cf65c` through SQL Editor. The editor's
**Run and enable RLS** option also enabled RLS on
`private.invitation_redemption_limits`. No seed, Auth user, membership, sample
record, application public-key configuration, or hosted Auth/PostgREST test has
been applied. Migrations `202609120004`, `202609120005`, and `202609120006` remain pending there.

SQL Editor execution may not have populated `supabase_migrations.schema_migrations`.
Before any linked CLI push, do **not** rerun the three create-table migrations or
reset the project. First retrieve the exact three files from the saved commit,
compare their SHA-256 values with the executed artifacts and this branch, and
inspect both migration history and representative schema state:

```bash
sha256sum supabase/migrations/20260912000{1,2,3}_*.sql
supabase migration list --linked
```

```sql
select version, name from supabase_migrations.schema_migrations order by version;
select n.nspname, c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where (n.nspname, c.relname) in
  (('private', 'invitation_redemption_limits'),
   ('public', 'invitations'), ('public', 'enrollments'))
order by 1, 2;
```

Only after the file hashes and inspected schema agree should an operator use the
installed Supabase CLI's documented migration-repair command to mark exactly
`202609120001`, `202609120002`, and `202609120003` as applied. Re-run
`supabase migration list --linked`, review the resulting diff so it contains only
the pending forward migrations, and then apply `202609120004` followed by
`202609120005`, then `202609120006`. Record the hashes and command output in the
private deployment log. Do not hand-insert migration-history rows or use `db reset`
on this project.

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

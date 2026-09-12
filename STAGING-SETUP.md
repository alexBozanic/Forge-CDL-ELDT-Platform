# Disposable Supabase staging verification

This procedure is required to validate behavior that plain PostgreSQL tests cannot cover. Use a disposable local or hosted Supabase project containing only `.example.invalid` identities and demonstration content. Do not use a production project, real student records, or a real email delivery provider.

## Project configuration

1. Apply `supabase/migrations/*.sql` in filename order. Do **not** apply `supabase/seed.sql`: it is a plain-PostgreSQL development fixture that includes a preselected fake platform administrator and is not an Auth-account bootstrap.
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

7. Sign in as that platform administrator and create two demonstration schools. Record their non-secret UUIDs, then create the minimum clearly labeled fixture from the trusted database shell. Do not insert memberships directly—the invitation flow under test must create them.

   ```bash
   psql "$DATABASE_URL" --no-psqlrc -v ON_ERROR_STOP=1 \
     -v first_organization_id=... \
     -v second_organization_id=... \
     -v platform_user_id=... <<'SQL'
   insert into public.courses (id, title, description, is_demo)
   values ('60000000-0000-4000-8000-000000000001',
     'Disposable onboarding demonstration',
     'Software-flow fixture only; not approved curriculum.', true);
   insert into public.course_versions (
     id, course_id, version_number, status, manifest_hash, published_at
   ) values (
     '60000000-0000-4000-8000-000000000002',
     '60000000-0000-4000-8000-000000000001', 1, 'published',
     repeat('6', 64), statement_timestamp()
   );
   insert into public.course_assignments (
     id, organization_id, course_version_id, title, created_by
   ) values
     ('60000000-0000-4000-8000-000000000003',
       :'first_organization_id'::uuid,
       '60000000-0000-4000-8000-000000000002',
       'First disposable assignment', :'platform_user_id'::uuid),
     ('60000000-0000-4000-8000-000000000004',
       :'second_organization_id'::uuid,
       '60000000-0000-4000-8000-000000000002',
       'Second disposable assignment', :'platform_user_id'::uuid);
   SQL
   ```

   Use `60000000-0000-4000-8000-000000000003` and `60000000-0000-4000-8000-000000000004` as the first and second assignment IDs below.

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
```

Run once against the disposable project:

```bash
node scripts/test-supabase-e2e.mjs
```

The script verifies real password token issuance, confirmed Auth users, platform-to-school-admin invitation, school-admin-to-student invitation, wrong-email and replay rejection, pinned enrollment visibility through RLS, cross-tenant assignment denial, invitation-hash denial, and token refresh. It never prints passwords or invitation tokens. Because it consumes invitations and creates memberships/enrollment, reset the disposable database before repeating it.

Manually exercise `/signup`, the local confirmation message, `/auth/confirm`, `/login`, `/invitations/accept`, `/password/recover`, and `/password/update` to verify the configured email templates and browser cookie flow. Those browser/email-template checks are not performed by the Node script.

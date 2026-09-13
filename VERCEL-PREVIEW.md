# Vercel preview deployment runbook

This runbook is for a **preview deployment only** of the existing Next.js app.
It does not authorize a production deployment, merge, custom-domain purchase,
real email, real student data, or a claim of curriculum/provider/state approval.

## Pin the source

1. In the connected Git provider, open PR4 and verify its head branch and commit.
   The last remotely verified release checkpoint is
   `7a56c600511d74cc4cadbe5365612d972dc681bd`. Deploy only the reviewed PR4 head
   commit (including subsequent committed fixes from this branch), never `main`.
2. In Vercel, import the existing repository and select that exact PR4 branch.
   Leave the Production Branch unchanged and do not promote or alias the preview.
3. Confirm the deployment's Git metadata shows the expected full commit SHA
   before opening it. Stop if Vercel built a different branch or commit.

## Preview environment variables

Set these three values in Vercel's **Preview** environment scope only:

| Variable                        | Required value                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://uooiziwxmuzdbdcxblox.supabase.co`                                                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The project's current browser-safe anonymous/public key, copied privately from the verified test-project dashboard |
| `NEXT_PUBLIC_SITE_URL`          | The exact HTTPS Vercel preview origin, with no path, query, fragment, or trailing route                            |

Despite the `NEXT_PUBLIC_` prefix, do not put secrets in these variables. Never
configure a Supabase service-role key, database URL, invitation token, assessment
answers, passwords, or SMTP credentials in the application deployment.

Because the preview origin can change, pin a stable Vercel preview URL for this
branch before setting `NEXT_PUBLIC_SITE_URL`. Rebuild the same reviewed commit
after setting variables; do not deploy another branch to obtain a convenient URL.

## Supabase Auth and test inbox prerequisite

Before browser testing, configure the test project's Auth Site URL as the exact
preview origin and allow only these required callback URLs:

- `<preview-origin>/auth/confirm`
- `http://localhost:3000/auth/confirm` for separate local testing

Keep email confirmation enabled. Configure a Supabase local/test inbox or another
non-delivering sink and prove it cannot deliver to real recipients. Do not disable
confirmation and do not insert rows into `auth.users` with SQL.

Using the Auth administration UI/API under a trusted operator session, create
four unique `.example.invalid` identities with generated untracked passwords:

1. platform administrator candidate;
2. school administrator invite recipient;
3. student invite recipient;
4. wrong-email negative-test user.

Confirm each through the test sink. Bootstrap only the first platform
administrator with `scripts/bootstrap-platform-admin.sh` from a trusted database
shell. Create school/student memberships through the application invitation flow;
never grant them with direct SQL. Keep all credentials in an untracked secret
store and never paste them into logs, issues, deployment output, or source.

## Preview-only verification

Verify `/`, `/login`, `/signup`, `/auth/confirm`, `/password/recover`, and
`/password/update`; then run the documented fake-user Auth/PostgREST test once
against a fresh prepared dataset. Manually check invitation acceptance, course
authoring/assignment, lesson delivery, assessment expiry/submission, reporting,
and transcript printing. Record the preview URL, exact Git SHA, test time, browser,
and sanitized outcome privately.

Stop after preview verification. Do not merge, promote, deploy to production,
configure real SMTP, seed the shared hosted database, or reset it.

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

All public tables enable and force RLS. Grants are revoked from `public` and `anon`; `authenticated` receives only the minimum table privileges that RLS can further constrain. Membership and platform-role writes have no client policy. School administrators can read active records in their school; students can read their own membership, organization, and profile. Students may update limited fields on their own profile, but database triggers prevent tenant/user key changes.

Authorization predicates are `SECURITY DEFINER` functions in the non-exposed `private` schema. Each has an empty, fixed `search_path`, schema-qualified names, stable volatility where valid, and execute privileges only for authenticated application users. Functions rely on `auth.uid()` and stored grants, never role data supplied by a client. A protected trigger additionally requires every student profile to reference a tenant-matched membership whose role is actually `student`.

Audit rows can be inserted only through the non-public `private.write_audit_event` building block, which verifies either a platform administrator or an active membership for the target tenant. It is intentionally not executable directly by application roles; future controlled command functions can call it. Application roles cannot update or delete audit rows. Database owners and service-role operators remain technically capable of changing them, so this is append-only for application roles rather than absolutely immutable.

## Planned immutable records

The next curriculum/completion migrations will add immutable publication manifests, manifest-bound reviews, enrollment-pinned content, protected answer keys, attempt snapshots, completion reporting-identity/provider snapshots, append-only corrections, and distinct TPR event states. These requirements are architectural constraints, not placeholders that may be weakened for development.

## Migration workflow

```bash
supabase start
supabase db reset
pnpm test:db
```

`supabase db reset` applies migrations from an empty local database and then runs `supabase/seed.sql`. `scripts/test-database.sh` also accepts `DATABASE_URL` and executes the integration SQL directly with `psql`. The test database must provide Supabase's `auth.uid()` function and `anon`/`authenticated` roles; the script's bootstrap supplies faithful local equivalents for plain PostgreSQL.

# Forge MVP validation execution plan

Last updated: 2026-09-13

## Provenance and non-negotiable boundary

The requested assessment/reporting checkpoint is commit `9c2f505`. The fresh
checkout currently exposes only branch `work` at `5bd9161`; `git cat-file -e
9c2f505^{commit}` fails and no remote is configured. The checkout therefore does
not contain the assessment/reporting implementation or `RELEASE-CHECKLIST.md`
described by the handoff. Do not recreate, overwrite, rebase, or represent this
older tree as that checkpoint. Work that depends on the missing commit resumes
only after the native workspace update makes that object available.

The hosted project remains mutation-frozen. It must not be reset or seeded, and
no migration may be applied until a controlled operator completes the guarded
reconciliation in `STAGING-SETUP.md`.

## Evidence from this environment

- The three required public environment variable names are present. Their values
  are not recorded here or printed by repository tooling.
- The configured Supabase origin was compared in memory with the expected
  `uooiziwxmuzdbdcxblox.supabase.co` origin.
- A single read-only `GET` for at most one `organizations.id` was attempted with
  the public key. The runtime failed before an HTTP response with `ENETUNREACH`.
  This proves neither API reachability nor RLS behavior; it is not an
  authorization denial and was not bypassed.
- There are no staging Auth credentials, database password, service-role key, or
  fake accounts in this environment. Authenticated end-to-end verification is
  consequently still pending.
- Local database tests require `DATABASE_URL` or a running Supabase CLI stack;
  neither is available in this environment.

## Work state

1. **Repository and history assessment — blocked by missing checkpoint.** The
   current tree was inspected rather than treated as the requested completed
   baseline.
2. **Unauthenticated hosted read — attempted, inconclusive.** Repeat exactly once
   when the scoped route is functional. An empty JSON array would establish
   reachability and anonymous read isolation, not authenticated correctness.
3. **Assessment, scoring, completion, transcript, and reporting audit — pending
   missing checkpoint.** Required cases include persisted question/option order,
   replay and concurrent submission, invalid and foreign option IDs, exactly
   80%, expiry, membership changes, missing reporting identity, immutable
   snapshots, append-only corrections, and answer-key isolation.
4. **Migration reconciliation — prepared, not executed.** Use
   `scripts/reconcile-staging-migrations.sh`; the default mode is inspection-only
   and the mutation mode has explicit evidence and confirmation gates.
5. **Browser and production smoke — pending application/checkpoint availability.**
   A browser walkthrough cannot validate missing assessment/reporting routes.

## Precise external gates

- Make commit `9c2f505` and its branch history available in this checkout.
- Restore outbound HTTPS routing to the single allowed Supabase hostname.
- For authenticated verification, provision the documented fake
  `.example.invalid` Auth accounts and IDs through the controlled staging setup.
- For hosted migration, provide an already authenticated/linked Supabase CLI to
  the operator. Do not provide credentials to this repository or command logs.

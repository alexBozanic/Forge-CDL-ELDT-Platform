# Software MVP release-readiness checklist

Passing local checks establishes software evidence only. It does not establish curriculum approval, provider eligibility, state eligibility, certification, or authorization to use real student data.

Current evidence: see `HOSTED-VERIFICATION.md` for the September 15 Preview
checkpoint. Student and school-admin role routes, fake reporting readiness/CSV,
and denial of the empty second school's routes passed. Direct Auth/PostgREST
isolation, actual PDF output, and hosted recovery remain separate open gates.

## Code and database

- [x] Upgrade Next.js and matching ESLint config to current stable 16.3.5,
      React/React DOM 19.3.0, and compatible tooling through the approved registry;
      regenerate the lockfile and pass frozen installation.
- [ ] Review every forward migration and verify hosted migration hashes/history.
- [x] Operator-reported application of exact release migrations 004-007 to the
      disposable hosted project without seed/reset; migration history remains absent.
- [x] Pass frozen install, format, lint, typecheck, clean PostgreSQL suites, and build locally.
- [ ] Run two-school Auth/PostgREST assessment and reporting tests with fake users.
- [ ] Confirm answer keys and submitted final payloads are absent from browser APIs.
- [x] Exercise concurrent invitation redemption and concurrent final submit/completion in PostgreSQL sessions.
- [x] Exercise tenant-isolated printable transcripts, immutable snapshots,
      persisted randomization, invalid/foreign options, expiry, replay, and
      revoked memberships in PostgreSQL.
- [x] Verify production responses emit anti-framing, no-sniff, referrer, and
      least-capability permissions headers.
- [x] Produce and refusal-test an inspection-only 004-007 migration bundle with
      exact hashes, source provenance, and read-only hosted verification SQL.
- [x] Validate assessment topic/count inputs, restrict questions to existing
      server-verified blueprint topics, and present safe accessible action errors.
- [ ] Recheck the valid blueprint-topic action once in Preview; the prior gateway
      timeout did not reproduce locally and no blind retry was added.

## Operations and privacy

- [ ] Configure Auth/email abuse controls using a non-delivering test inbox.
- [x] Rehearse dump/restore with representative fake fixtures between separate
      disposable local PostgreSQL databases and verify schema, RLS, grants, and history.
- [ ] Complete backup and point-in-time restore rehearsal with documented evidence.
- [ ] Approve retention/deletion rules, audit monitoring, incident response, and secret scanning.
- [ ] Verify no SSN field, service-role key, invitation secret, or answer key is collected/logged.

## Product and accessibility

- [x] Publish the authorized Vercel Preview after dependency repair and passing
      checks. Latest application verification is recorded in `HOSTED-VERIFICATION.md`.
- [ ] Keyboard and screen-reader walkthrough for onboarding, lessons, assessments, and reporting.
- [ ] Inspect narrow mobile and desktop layouts in actual supported browsers.
- [ ] Review empty/loading/error/expired-attempt states with fake data.
- [ ] Obtain separate curriculum, provider, and state eligibility decisions outside this software checklist.

## Explicitly prohibited for this review

- Production deployment, merge, paid purchase, real email, real student records, automated FMCSA submission, or claims of compliance/approval/readiness.

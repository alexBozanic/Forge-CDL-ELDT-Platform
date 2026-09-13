# Software MVP release-readiness checklist

Passing local checks establishes software evidence only. It does not establish curriculum approval, provider eligibility, state eligibility, certification, or authorization to use real student data.

## Code and database

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

## Operations and privacy

- [ ] Configure Auth/email abuse controls using a non-delivering test inbox.
- [x] Rehearse dump/restore with representative fake fixtures between separate
      disposable local PostgreSQL databases and verify schema, RLS, grants, and history.
- [ ] Complete backup and point-in-time restore rehearsal with documented evidence.
- [ ] Approve retention/deletion rules, audit monitoring, incident response, and secret scanning.
- [ ] Verify no SSN field, service-role key, invitation secret, or answer key is collected/logged.

## Product and accessibility

- [ ] Keyboard and screen-reader walkthrough for onboarding, lessons, assessments, and reporting.
- [ ] Inspect narrow mobile and desktop layouts in actual supported browsers.
- [ ] Review empty/loading/error/expired-attempt states with fake data.
- [ ] Obtain separate curriculum, provider, and state eligibility decisions outside this software checklist.

## Explicitly prohibited for this review

- Production deployment, merge, paid purchase, real email, real student records, automated FMCSA submission, or claims of compliance/approval/readiness.

# MVP release evidence checklist

Checking a software item here does not establish curriculum approval, provider
eligibility, jurisdiction eligibility, or authorization for regulated delivery.
Schools remain providers of record and manually submit TPR information.

## Source and database

- [ ] The release commit descends from assessment/reporting checkpoint `9c2f505`.
- [ ] Every migration source hash matches the reviewed deployment record.
- [ ] Hosted migration history and representative schema state were reconciled
      without `db reset`, fixture bootstrap, seed data, or direct history edits.
- [ ] Only migrations shown as pending after reconciliation were applied, in
      filename order, and post-deployment verification SQL passed.
- [ ] Real PostgreSQL authorization tests cover every RLS policy and privileged
      function for platform admin, two schools, student, anonymous, and changed
      membership contexts.

## Assessment and historical truth

- [ ] Published content and answer keys are immutable and browser clients cannot
      select protected answer-key data.
- [ ] Attempt records persist the exact question and option ordering shown.
- [ ] Submission rejects replay, concurrent duplicate work, expired attempts,
      duplicate selections, missing selections, and foreign/invalid option IDs.
- [ ] Score boundaries immediately below, at, and above exactly 80% are tested.
- [ ] Completion is idempotent and requires the pinned version, complete lesson
      requirements, a qualifying attempt, current authorization, and complete
      reporting identity.
- [ ] Completion freezes student identity, provider identity, course manifest,
      content, and qualifying-attempt snapshots.
- [ ] Attempts, completions, reporting snapshots/events, audit events, and
      corrections are append-only; correction history preserves before/after,
      reason, actor, and date.
- [ ] Full transcript shows pinned content, lesson history, attempts with dates
      and scores, completion snapshots, and corrections. Reporting history is
      labeled and presented separately from the full transcript.
- [ ] Demonstration content cannot cross into non-demo schools or be represented
      as approved, certified, compliant, or ready for regulated delivery.

## Runtime evidence

- [ ] Frozen install, format, lint, typecheck, real database tests, and production
      build pass on the exact release commit.
- [ ] Anonymous hosted reads expose no tenant data or protected schema metadata.
- [ ] Authenticated hosted tests prove two-school isolation and current-membership
      revocation with fake accounts only.
- [ ] Desktop and mobile browser journeys have no dead ends and cover loading,
      empty, validation, denial, not-found, and error states.
- [ ] Production HTTP smoke confirms expected redirects, security headers, and no
      secret or sensitive record in HTML, URLs, browser bundles, or logs.

## Human-controlled gates

- [ ] An independent curriculum reviewer approves the exact manifest.
- [ ] The school separately confirms provider and jurisdiction eligibility.
- [ ] Backup/restore, retention, accessibility, incident response, and support
      evidence is accepted for the intended software pilot.
- [ ] The school confirms it will remain provider of record and perform manual
      TPR submission and disposition tracking.

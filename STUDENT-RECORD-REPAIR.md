# Missing student records and school navigation

The authenticated school-admin Preview reproduced a missing-record defect at
`/schools/forge-demo/students/00000000-0000-4000-8000-000000000000`:
the application displayed School workspace unavailable rather than Page not found.
The membership query used `single()`, so an expected empty result threw before
the page's missing-membership check.

Student membership now loads before profile/history queries, with the existing
authenticated RLS client and organization/user/student-role filters. Malformed
UUIDs and absent memberships result in the not-found page. Real lookup failures
remain errors with a sanitized message; they are not misrepresented as absence.
Administrative access to existing inactive student records is preserved.

Regression coverage checks malformed IDs, missing records, another school's
membership, valid records, and sanitized database failures. CI runs the new
`test:student-records` suite alongside existing application tests.

Both school workspace variants now link to Dashboard. The school error screen
also includes the dashboard link promised by its existing recovery text.

No hosted data, migrations, auth rules, dependency versions, or lockfile changed.
The missing and existing record routes and keyboard navigation must be checked
on the updated Preview after application/database CI and deployment complete.

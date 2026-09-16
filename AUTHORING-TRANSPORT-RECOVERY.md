# Topic and question transport recovery

Topic and question forms now catch rejected server-action calls as well as
returned RPC failures. Next.js navigation signals still reach the framework.
Both forms cancel native reset, disable every field while pending and focus a
sanitized alert on failure. The no-blueprint question form remains disabled.
The recovery message describes an uncertain save, not a proven absent write.
There are no automatic retries or changes to authorization, permitted-topic
validation, positive counts, private answer keys or published immutability.

Local browser verification used actual copied components with fake callbacks:

- Topic code fake_topic and count 1 survived a thrown action.
- Selected blueprint, prompt, two options, correct option 1 and rationale all
  survived a returned error.
- All fields disabled while pending, restored after failure; question error
  received focus. No private fixture error text reached the displayed feedback.

These are synthetic UI checks, not hosted authoring or instructor-reviewed
content. The fixture generator and recipe reproduce the scenarios without
Supabase access. User/instructor workbook remains untouched.

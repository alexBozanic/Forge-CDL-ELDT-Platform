import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const required = [
  "STAGING_SUPABASE_URL",
  "STAGING_SUPABASE_ANON_KEY",
  "STAGING_PLATFORM_EMAIL",
  "STAGING_PLATFORM_PASSWORD",
  "STAGING_SCHOOL_ADMIN_EMAIL",
  "STAGING_SCHOOL_ADMIN_PASSWORD",
  "STAGING_STUDENT_EMAIL",
  "STAGING_STUDENT_PASSWORD",
  "STAGING_WRONG_EMAIL",
  "STAGING_WRONG_PASSWORD",
  "STAGING_ORGANIZATION_ID",
  "STAGING_ASSIGNMENT_ID",
  "STAGING_SECOND_ASSIGNMENT_ID",
  "STAGING_ASSESSMENT_ANSWERS",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const url = process.env.STAGING_SUPABASE_URL;
const key = process.env.STAGING_SUPABASE_ANON_KEY;
const client = () =>
  createClient(url, key, { auth: { persistSession: false } });
const digest = (token) => createHash("sha256").update(token).digest("hex");
const expiresAt = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

async function signIn(emailName, passwordName) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env[emailName],
    password: process.env[passwordName],
  });
  if (error || !data.user || !data.session)
    throw new Error(`${emailName} sign-in failed`);
  if (!data.user.email_confirmed_at)
    throw new Error(`${emailName} is not confirmed`);
  return supabase;
}

const platform = await signIn(
  "STAGING_PLATFORM_EMAIL",
  "STAGING_PLATFORM_PASSWORD",
);
const schoolAdmin = await signIn(
  "STAGING_SCHOOL_ADMIN_EMAIL",
  "STAGING_SCHOOL_ADMIN_PASSWORD",
);
const student = await signIn(
  "STAGING_STUDENT_EMAIL",
  "STAGING_STUDENT_PASSWORD",
);
const wrongUser = await signIn("STAGING_WRONG_EMAIL", "STAGING_WRONG_PASSWORD");

const adminToken = randomBytes(32).toString("base64url");
const { error: adminInviteError } = await platform.rpc(
  "create_school_admin_invitation",
  {
    target_organization_id: process.env.STAGING_ORGANIZATION_ID,
    invitation_email: process.env.STAGING_SCHOOL_ADMIN_EMAIL.toLowerCase(),
    invitation_token_hash: digest(adminToken),
    invitation_expires_at: expiresAt(),
  },
);
if (adminInviteError) throw new Error("Platform admin invitation failed");
const { data: adminAccepted, error: adminAcceptError } = await schoolAdmin.rpc(
  "accept_student_invitation",
  { invitation_token_hash: digest(adminToken) },
);
if (adminAcceptError || adminAccepted !== process.env.STAGING_ORGANIZATION_ID) {
  throw new Error("School administrator acceptance failed");
}

const studentToken = randomBytes(32).toString("base64url");
const { error: studentInviteError } = await schoolAdmin.rpc(
  "create_student_invitation",
  {
    target_organization_id: process.env.STAGING_ORGANIZATION_ID,
    invitation_email: process.env.STAGING_STUDENT_EMAIL.toLowerCase(),
    invitation_token_hash: digest(studentToken),
    invitation_expires_at: expiresAt(),
    target_assignment_id: process.env.STAGING_ASSIGNMENT_ID,
  },
);
if (studentInviteError) throw new Error("Student invitation failed");

const { data: wrongAccepted, error: wrongAcceptError } = await wrongUser.rpc(
  "accept_student_invitation",
  { invitation_token_hash: digest(studentToken) },
);
if (wrongAcceptError || wrongAccepted !== null)
  throw new Error("Wrong email was not rejected generically");

const { data: accepted, error: acceptError } = await student.rpc(
  "accept_student_invitation",
  {
    invitation_token_hash: digest(studentToken),
  },
);
if (acceptError || accepted !== process.env.STAGING_ORGANIZATION_ID) {
  throw new Error("Student invitation acceptance failed");
}
const { data: replayed, error: replayError } = await student.rpc(
  "accept_student_invitation",
  {
    invitation_token_hash: digest(studentToken),
  },
);
if (replayError || replayed !== null)
  throw new Error("Invitation replay was not rejected generically");

const { data: enrollments, error: enrollmentError } = await student
  .from("enrollments")
  .select("id, organization_id, assignment_id, course_version_id")
  .eq("organization_id", process.env.STAGING_ORGANIZATION_ID);
if (
  enrollmentError ||
  enrollments?.length !== 1 ||
  !enrollments[0].course_version_id
) {
  throw new Error("Pinned student enrollment was not visible through RLS");
}

const { data: manifestLessons, error: manifestError } = await student
  .from("course_version_manifest_lessons")
  .select("lesson_id, manifest_position")
  .eq("course_version_id", enrollments[0].course_version_id)
  .order("manifest_position");
if (manifestError || !manifestLessons?.length) {
  throw new Error("Pinned lesson manifest was not visible through RLS");
}
const interactionKey = globalThis.crypto.randomUUID();
for (let attempt = 0; attempt < 2; attempt += 1) {
  const { error: interactionError } = await student.rpc(
    "record_lesson_interaction",
    {
      target_enrollment_id: enrollments[0].id,
      target_lesson_id: manifestLessons[0].lesson_id,
      target_interaction_type: "opened",
      target_resume_position: 0,
      request_idempotency_key: interactionKey,
    },
  );
  if (interactionError) throw new Error("Lesson interaction RPC failed");
}
for (const lesson of manifestLessons) {
  const { error } = await student.rpc("record_lesson_interaction", {
    target_enrollment_id: enrollments[0].id,
    target_lesson_id: lesson.lesson_id,
    target_interaction_type: "completed",
    target_resume_position: 0,
    request_idempotency_key: globalThis.crypto.randomUUID(),
  });
  if (error)
    throw new Error("Pinned lesson prerequisite could not be recorded");
}
const { data: interactionEvents, error: eventsError } = await student
  .from("lesson_interaction_events")
  .select("id")
  .eq("enrollment_id", enrollments[0].id)
  .eq("idempotency_key", interactionKey);
if (eventsError || interactionEvents?.length !== 1) {
  throw new Error("Lesson interaction idempotency failed through PostgREST");
}

const { data: finals, error: finalError } = await student
  .from("assessments")
  .select("id")
  .eq("course_version_id", enrollments[0].course_version_id)
  .eq("kind", "final_exam");
if (finalError || finals?.length !== 1)
  throw new Error("Pinned final assessment was not visible through RLS");
const { data: started, error: startError } = await student.rpc(
  "start_assessment",
  {
    target_enrollment_id: enrollments[0].id,
    target_assessment_id: finals[0].id,
    request_idempotency_key: globalThis.crypto.randomUUID(),
  },
);
if (startError || !started?.attempt_id || !started?.questions?.length)
  throw new Error("Final assessment start failed through PostgREST");
if (JSON.stringify(started).includes("is_correct"))
  throw new Error("Assessment start leaked correctness metadata");
let stagingAnswers;
try {
  stagingAnswers = JSON.parse(process.env.STAGING_ASSESSMENT_ANSWERS);
} catch {
  throw new Error("STAGING_ASSESSMENT_ANSWERS must be valid untracked JSON");
}
const { data: result, error: submitError } = await student.rpc(
  "submit_assessment",
  { target_attempt_id: started.attempt_id, submitted_answers: stagingAnswers },
);
if (submitError || result?.status !== "passed")
  throw new Error("Server-scored passing final failed through PostgREST");
const { data: completions, error: completionError } = await student
  .from("course_completions")
  .select("id, course_manifest_hash, reporting_ready")
  .eq("enrollment_id", enrollments[0].id);
if (completionError || completions?.length !== 1)
  throw new Error("Idempotent completion was not visible through RLS");
for (const protectedTable of [
  "assessment_answers",
  "assessment_answer_keys",
  "assessment_attempt_payloads",
]) {
  const { error } = await student.from(protectedTable).select("*").limit(1);
  if (!error) throw new Error(`${protectedTable} was browser-readable`);
}
const { data: reporting, error: reportingError } = await schoolAdmin
  .from("reporting_records")
  .select("id, status, completion_id")
  .eq("completion_id", completions[0].id);
if (reportingError || reporting?.length !== 1)
  throw new Error("School reporting queue was not tenant-visible");

const crossToken = randomBytes(32).toString("base64url");
const { error: crossTenantError } = await schoolAdmin.rpc(
  "create_student_invitation",
  {
    target_organization_id: process.env.STAGING_ORGANIZATION_ID,
    invitation_email: process.env.STAGING_WRONG_EMAIL.toLowerCase(),
    invitation_token_hash: digest(crossToken),
    invitation_expires_at: expiresAt(),
    target_assignment_id: process.env.STAGING_SECOND_ASSIGNMENT_ID,
  },
);
if (!crossTenantError) throw new Error("Cross-tenant assignment was accepted");

const { error: hashReadError } = await schoolAdmin
  .from("invitations")
  .select("token_hash");
if (!hashReadError)
  throw new Error("Invitation hashes were readable through the API");
const { data: refreshed, error: refreshError } =
  await student.auth.refreshSession();
if (refreshError || !refreshed.session)
  throw new Error("Session refresh failed");

console.log(
  "Supabase Auth/PostgREST onboarding checks passed with disposable fake accounts.",
);

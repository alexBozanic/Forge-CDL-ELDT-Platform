import { ProfileForm } from "../../profile/profile-form";
import { notFound } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth";
import { enrollStudent } from "../actions";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; userId: string }>;
}) {
  const { slug, userId } = await params;
  const { supabase, isPlatformAdministrator, memberships } =
    await getAuthorizationContext();
  const adminMembership = memberships.find((item) => {
    const org = Array.isArray(item.organizations)
      ? item.organizations[0]
      : item.organizations;
    return (
      org?.slug === slug &&
      item.status === "active" &&
      item.role === "school_admin"
    );
  });
  if (!isPlatformAdministrator && !adminMembership) notFound();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", slug)
    .single();
  if (!organization) notFound();
  const results = await Promise.all([
    supabase
      .from("organization_memberships")
      .select("user_id, status, created_at")
      .eq("organization_id", organization.id)
      .eq("user_id", userId)
      .eq("role", "student")
      .single(),
    supabase
      .from("student_profiles")
      .select(
        "legal_first_name, legal_middle_name, legal_last_name, date_of_birth, license_or_permit_number, issuing_jurisdiction",
      )
      .eq("organization_id", organization.id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("enrollments")
      .select(
        "id, status, course_version_id, course_assignments(title, course_versions(title, version_number, manifest_hash))",
      )
      .eq("organization_id", organization.id)
      .eq("student_user_id", userId),
    supabase
      .from("course_assignments")
      .select("id, title")
      .eq("organization_id", organization.id)
      .eq("active", true),
    supabase
      .from("lesson_progress")
      .select(
        "enrollment_id, lesson_id, status, resume_position, first_opened_at, last_opened_at, completed_at",
      )
      .eq("organization_id", organization.id)
      .eq("student_user_id", userId),
    supabase.from("course_lessons").select("id, title"),
    supabase
      .from("assessment_attempts")
      .select(
        "id, enrollment_id, attempt_number, status, score_percent, question_count, correct_count, started_at, submitted_at, course_version_manifest_assessments(assessments(title, kind))",
      )
      .eq("organization_id", organization.id)
      .eq("student_user_id", userId)
      .order("started_at", { ascending: false }),
    supabase
      .from("course_completions")
      .select(
        "id, enrollment_id, completed_at, course_manifest_hash, reporting_ready, readiness_issues",
      )
      .eq("organization_id", organization.id)
      .eq("student_user_id", userId),
  ] as const);
  for (const result of results) {
    if (result.error) throw result.error;
  }
  const [
    { data: membership },
    { data: profile },
    { data: enrollments },
    { data: assignments },
    { data: progress },
    { data: lessons },
    { data: attempts },
    { data: completions },
  ] = results;
  if (!membership) notFound();
  const lessonTitles = new Map(
    (lessons ?? []).map((lesson) => [lesson.id, lesson.title]),
  );
  return (
    <main className="container main" id="main-content">
      <p className="kicker">{organization.name} · Student record</p>
      <h1>
        {profile
          ? `${profile.legal_first_name} ${profile.legal_middle_name ?? ""} ${profile.legal_last_name}`
          : "Profile pending"}
      </h1>
      <p>
        Membership status: <strong>{membership.status}</strong>
      </p>
      <ProfileForm
        organizationId={organization.id}
        userId={userId}
        slug={slug}
        profile={profile}
      />
      <div className="two-column">
        <section>
          <h2>Enrollments</h2>
          {enrollments?.length ? (
            <div className="list-stack">
              {enrollments.map((enrollment) => {
                const assignment = Array.isArray(enrollment.course_assignments)
                  ? enrollment.course_assignments[0]
                  : enrollment.course_assignments;
                const version = Array.isArray(assignment?.course_versions)
                  ? assignment?.course_versions[0]
                  : assignment?.course_versions;
                const enrollmentProgress = progress?.filter(
                  (item) => item.enrollment_id === enrollment.id,
                );
                return (
                  <article className="gate" key={enrollment.id}>
                    <h3>{assignment?.title ?? "Assignment"}</h3>
                    <p>
                      {enrollment.status} · {version?.title ?? "Version"} ·
                      pinned version{" "}
                      {version?.version_number ?? enrollment.course_version_id}
                    </p>
                    <p>
                      Manifest: <code>{version?.manifest_hash}</code>
                    </p>
                    {enrollmentProgress?.length ? (
                      <ul>
                        {enrollmentProgress.map((item) => (
                          <li key={item.lesson_id}>
                            {lessonTitles.get(item.lesson_id) ??
                              "Manifest lesson"}
                            : {item.status} · last opened{" "}
                            {item.last_opened_at
                              ? new Date(item.last_opened_at).toLocaleString()
                              : "not recorded"}
                            {item.completed_at
                              ? ` · interaction completed ${new Date(item.completed_at).toLocaleString()}`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No lesson interactions recorded.</p>
                    )}
                    {(attempts ?? [])
                      .filter(
                        (attempt) => attempt.enrollment_id === enrollment.id,
                      )
                      .map((attempt) => {
                        const manifest = Array.isArray(
                          attempt.course_version_manifest_assessments,
                        )
                          ? attempt.course_version_manifest_assessments[0]
                          : attempt.course_version_manifest_assessments;
                        const assessment = Array.isArray(manifest?.assessments)
                          ? manifest?.assessments[0]
                          : manifest?.assessments;
                        return (
                          <p key={attempt.id}>
                            {assessment?.title ?? "Assessment"} attempt{" "}
                            {attempt.attempt_number}: {attempt.status}
                            {attempt.score_percent === null
                              ? ""
                              : ` · ${attempt.score_percent}% (${attempt.correct_count}/${attempt.question_count})`}{" "}
                            · started{" "}
                            {new Date(attempt.started_at).toLocaleString()}
                            {attempt.submitted_at
                              ? ` · submitted ${new Date(attempt.submitted_at).toLocaleString()}`
                              : ""}
                          </p>
                        );
                      })}
                    {(completions ?? [])
                      .filter(
                        (completion) =>
                          completion.enrollment_id === enrollment.id,
                      )
                      .map((completion) => (
                        <div className="notice" key={completion.id}>
                          <strong>Software completion snapshot</strong>
                          <span>
                            {new Date(completion.completed_at).toLocaleString()}{" "}
                            · manifest {completion.course_manifest_hash} ·
                            reporting{" "}
                            {completion.reporting_ready
                              ? "ready"
                              : "needs attention"}
                            . External submission and acceptance are separate.
                          </span>
                        </div>
                      ))}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No enrollment</h3>
              <p>This student has no demonstration assignment.</p>
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Assign published content</h2>
          {membership.status === "active" && assignments?.length ? (
            <form action={enrollStudent} className="form-stack">
              <input
                type="hidden"
                name="organizationId"
                value={organization.id}
              />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="userId" value={userId} />
              <label>
                Assignment
                <select name="assignmentId" required>
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.title}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button" type="submit">
                Enroll student
              </button>
            </form>
          ) : (
            <p>No active student/assignment combination is available.</p>
          )}
        </section>
      </div>
    </main>
  );
}

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
  const [
    { data: membership },
    { data: profile },
    { data: enrollments },
    { data: assignments },
    { data: progress },
    { data: lessons },
  ] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select("user_id, status, created_at")
      .eq("organization_id", organization.id)
      .eq("user_id", userId)
      .eq("role", "student")
      .single(),
    supabase
      .from("student_profiles")
      .select("legal_first_name, legal_middle_name, legal_last_name")
      .eq("organization_id", organization.id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("enrollments")
      .select(
        "id, status, course_version_id, course_assignments(title), course_versions(title, version_number, manifest_hash)",
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
  ]);
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
      <div className="two-column">
        <section>
          <h2>Enrollments</h2>
          {enrollments?.length ? (
            <div className="list-stack">
              {enrollments.map((enrollment) => {
                const assignment = Array.isArray(enrollment.course_assignments)
                  ? enrollment.course_assignments[0]
                  : enrollment.course_assignments;
                const version = Array.isArray(enrollment.course_versions)
                  ? enrollment.course_versions[0]
                  : enrollment.course_versions;
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

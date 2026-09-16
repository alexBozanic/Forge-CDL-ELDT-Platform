import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { recordTime } from "@/lib/record-time";

export default async function StudentCoursePage({
  params,
}: {
  params: Promise<{ slug: string; enrollmentId: string }>;
}) {
  const { slug, enrollmentId } = await params;
  const { supabase, user } = await requireUser();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, brand_primary_color, brand_accent_color")
    .eq("slug", slug)
    .single();
  if (!organization) notFound();
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select(
      "id, organization_id, course_version_id, status, course_assignments(title)",
    )
    .eq("id", enrollmentId)
    .eq("organization_id", organization.id)
    .eq("student_user_id", user.id)
    .single();
  if (!enrollment) notFound();
  const [
    versionResult,
    modulesResult,
    lessonsResult,
    progressResult,
    assessmentsResult,
    attemptsResult,
    completionResult,
  ] = await Promise.all([
    supabase
      .from("course_versions")
      .select("id, title, description, version_number, manifest_hash")
      .eq("id", enrollment.course_version_id)
      .single(),
    supabase
      .from("course_modules")
      .select("id, title, position")
      .eq("course_version_id", enrollment.course_version_id)
      .order("position"),
    supabase
      .from("course_version_manifest_lessons")
      .select(
        "lesson_id, module_id, manifest_position, course_lessons(title, estimated_minutes)",
      )
      .eq("course_version_id", enrollment.course_version_id)
      .order("manifest_position"),
    supabase
      .from("lesson_progress")
      .select(
        "lesson_id, status, resume_position, last_opened_at, completed_at, updated_at",
      )
      .eq("enrollment_id", enrollment.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("assessments")
      .select(
        "id, title, kind, lesson_id, position, question_count, passing_percent",
      )
      .eq("course_version_id", enrollment.course_version_id)
      .order("position"),
    supabase
      .from("assessment_attempts")
      .select(
        "id, assessment_id, attempt_number, status, score_percent, submitted_at",
      )
      .eq("enrollment_id", enrollment.id)
      .order("started_at", { ascending: false }),
    supabase
      .from("course_completions")
      .select("id, completed_at, reporting_ready, readiness_issues")
      .eq("enrollment_id", enrollment.id)
      .maybeSingle(),
  ]);
  if (versionResult.error || !versionResult.data) notFound();
  for (const result of [
    modulesResult,
    lessonsResult,
    progressResult,
    assessmentsResult,
    attemptsResult,
    completionResult,
  ])
    if (result.error) throw result.error;
  const progress = new Map(
    (progressResult.data ?? []).map((item) => [item.lesson_id, item]),
  );
  const firstLesson = lessonsResult.data?.[0]?.lesson_id;
  const accessibleLessonIds = new Set(
    (lessonsResult.data ?? []).map((lesson) => lesson.lesson_id),
  );
  const resumeLesson =
    enrollment.status === "active"
      ? (progressResult.data?.find((item) =>
          accessibleLessonIds.has(item.lesson_id),
        )?.lesson_id ?? firstLesson)
      : undefined;
  const assignment = Array.isArray(enrollment.course_assignments)
    ? enrollment.course_assignments[0]
    : enrollment.course_assignments;
  return (
    <main
      className="container main branded-shell"
      style={
        {
          "--school-primary": organization.brand_primary_color,
          "--school-accent": organization.brand_accent_color,
        } as React.CSSProperties
      }
      id="main-content"
    >
      <nav className="inline-form" aria-label="Course navigation">
        <Link href={`/schools/${slug}`}>School workspace</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>
      <p className="kicker">
        {organization.name} · Assigned version{" "}
        {versionResult.data.version_number}
      </p>
      <h1>{versionResult.data.title}</h1>
      <p className="lede">{versionResult.data.description}</p>
      <div className="notice">
        <strong>Demonstration learning content</strong>
        <span>
          Lesson interactions are not proof of attention, course completion,
          certification, or reporting readiness.
        </span>
      </div>
      {resumeLesson ? (
        <p>
          <Link
            className="button"
            href={`/schools/${slug}/courses/${enrollment.id}/lessons/${resumeLesson}`}
          >
            {progressResult.data?.length
              ? "Resume learning"
              : "Start first lesson"}
          </Link>
        </p>
      ) : null}
      <section>
        <h2>{assignment?.title ?? "Course outline"}</h2>
        {!modulesResult.data?.length ? (
          <p>
            {enrollment.status === "completed"
              ? "This enrollment is completed. Lesson access requires an active enrollment; your assessment results and completion record remain below."
              : "No lessons are available for this enrollment."}
          </p>
        ) : null}
        {modulesResult.data?.map((module) => (
          <article className="module-card" key={module.id}>
            <h3>
              {module.position}. {module.title}
            </h3>
            <div className="list-stack">
              {lessonsResult.data
                ?.filter((lesson) => lesson.module_id === module.id)
                .map((lesson) => {
                  const details = Array.isArray(lesson.course_lessons)
                    ? lesson.course_lessons[0]
                    : lesson.course_lessons;
                  const state = progress.get(lesson.lesson_id);
                  return (
                    <Link
                      className="list-row"
                      href={`/schools/${slug}/courses/${enrollment.id}/lessons/${lesson.lesson_id}`}
                      key={lesson.lesson_id}
                    >
                      <span>
                        {lesson.manifest_position}. {details?.title}
                      </span>
                      <span>
                        {state?.status ?? "not started"}
                        {state?.completed_at
                          ? ` · ${recordTime(state.completed_at)}`
                          : ""}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </article>
        ))}
      </section>
      <section>
        <h2>Assessments</h2>
        {assessmentsResult.data?.length ? (
          <div className="list-stack">
            {assessmentsResult.data.map((assessment) => {
              const latest = attemptsResult.data?.find(
                (attempt) => attempt.assessment_id === assessment.id,
              );
              const destination =
                latest?.status === "in_progress"
                  ? `/schools/${slug}/courses/${enrollment.id}/attempts/${latest.id}`
                  : `/schools/${slug}/courses/${enrollment.id}/assessments/${assessment.id}`;
              return (
                <article className="gate" key={assessment.id}>
                  <h3>{assessment.title}</h3>
                  <p>
                    {assessment.kind.replace("_", " ")} ·{" "}
                    {assessment.question_count} questions ·{" "}
                    {assessment.passing_percent}% required
                  </p>
                  {latest ? (
                    <p>
                      Latest attempt {latest.attempt_number}: {latest.status}
                      {latest.score_percent === null
                        ? ""
                        : ` · ${latest.score_percent}%`}
                    </p>
                  ) : (
                    <p>No attempt recorded.</p>
                  )}
                  <Link className="button secondary" href={destination}>
                    {latest?.status === "in_progress"
                      ? "Resume attempt"
                      : latest
                        ? "Start another attempt"
                        : "Start assessment"}
                  </Link>
                  {latest && latest.status !== "in_progress" ? (
                    <p>
                      <Link
                        href={`/schools/${slug}/courses/${enrollment.id}/attempts/${latest.id}`}
                      >
                        View latest result
                      </Link>
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No assessment in this version</h3>
            <p>
              Assessment content is version-specific and cannot be added after
              publication.
            </p>
          </div>
        )}
      </section>
      {completionResult.data ? (
        <section className="notice">
          <strong>Software course completion recorded</strong>
          <span>
            {recordTime(completionResult.data.completed_at)}. This is separate
            from certification and external TPR submission or acceptance.
            Reporting readiness at completion:{" "}
            {completionResult.data.reporting_ready
              ? "ready for manual review"
              : "needs attention"}
            .
          </span>
        </section>
      ) : null}
    </main>
  );
}

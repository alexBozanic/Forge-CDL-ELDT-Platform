import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { startAssessment } from "./actions";

export default async function AssessmentStartPage({
  params,
}: {
  params: Promise<{ slug: string; enrollmentId: string; assessmentId: string }>;
}) {
  const { slug, enrollmentId, assessmentId } = await params;
  const { supabase, user } = await requireUser();
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, course_version_id, status")
    .eq("id", enrollmentId)
    .eq("student_user_id", user.id)
    .single();
  if (!enrollment) notFound();
  const { data: assessment } = await supabase
    .from("assessments")
    .select(
      "id, title, kind, question_count, passing_percent, time_limit_minutes",
    )
    .eq("id", assessmentId)
    .eq("course_version_id", enrollment.course_version_id)
    .single();
  if (!assessment) notFound();
  return (
    <main className="container main" id="main-content">
      <p className="kicker">Version-pinned assessment</p>
      <h1>{assessment.title}</h1>
      <div className="notice">
        <strong>
          {assessment.kind === "final_exam"
            ? "Final assessment"
            : "Lesson quiz"}
        </strong>
        <span>
          {assessment.question_count} questions ·{" "}
          {assessment.time_limit_minutes} minutes · {assessment.passing_percent}
          % required. Final questions and answer explanations are not disclosed
          after submission.
        </span>
      </div>
      <p>
        Starting creates an immutable attempt and fixes the exact question
        selection and option order. Required lessons must be recorded before a
        final can start.
      </p>
      <form action={startAssessment}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="enrollmentId" value={enrollmentId} />
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <button className="button">Start assessment</button>
      </form>
    </main>
  );
}

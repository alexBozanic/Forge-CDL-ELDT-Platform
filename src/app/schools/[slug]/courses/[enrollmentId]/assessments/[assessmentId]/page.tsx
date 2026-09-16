import { notFound } from "next/navigation";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { startAssessment } from "./actions";
import { StartForm } from "./start-form";

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
      <p>
        <Link href={`/schools/${slug}/courses/${enrollmentId}`}>
          Return to course
        </Link>
      </p>
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
      <StartForm
        slug={slug}
        enrollmentId={enrollmentId}
        assessmentId={assessmentId}
        start={startAssessment.bind(null, randomUUID())}
      />
    </main>
  );
}

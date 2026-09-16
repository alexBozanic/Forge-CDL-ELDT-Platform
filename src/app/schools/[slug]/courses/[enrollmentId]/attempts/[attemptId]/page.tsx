import { loadSchoolEnrollment } from "@/lib/school-enrollment";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { recordTime } from "@/lib/record-time";
import type { SelectedQuestion } from "@/lib/assessment-submission";
import { AttemptForm } from "./attempt-form";
export default async function AttemptPage({
  params,
}: {
  params: Promise<{ slug: string; enrollmentId: string; attemptId: string }>;
}) {
  const { slug, enrollmentId, attemptId } = await params;
  const { supabase, user } = await requireUser();
  if (!(await loadSchoolEnrollment(supabase, slug, enrollmentId, user.id)))
    notFound();
  const { data: attempt, error } = await supabase.rpc(
    "get_assessment_attempt",
    {
      target_attempt_id: attemptId,
    },
  );
  if (error || !attempt || attempt.enrollment_id !== enrollmentId) notFound();
  const { data: assessment } = await supabase
    .from("assessments")
    .select("title, kind")
    .eq("id", attempt.assessment_id)
    .single();
  const questions = (attempt.questions ?? []) as SelectedQuestion[];
  return (
    <main className="container main assessment-reader" id="main-content">
      <p className="kicker">{assessment?.title ?? "Assessment"}</p>
      <h1>
        {attempt.status === "in_progress"
          ? "Answer your assessment"
          : "Attempt result"}
      </h1>
      <p>
        <Link href={`/schools/${slug}/courses/${enrollmentId}`}>
          Return to course
        </Link>
      </p>
      {attempt.status === "in_progress" ? (
        <>
          <p>
            Submit before {recordTime(attempt.expires_at)}. The time limit
            continues if you leave this page. Choices are kept here after a
            submission error, but are not saved when you leave or reload.
          </p>
          <AttemptForm
            slug={slug}
            enrollmentId={enrollmentId}
            attemptId={attempt.id}
            questions={questions}
          />
        </>
      ) : (
        <section className="panel">
          <h2>{attempt.status}</h2>
          <p>
            Score: {attempt.score_percent}% · {attempt.correct_count}/
            {attempt.question_count} correct · required{" "}
            {attempt.passing_percent}%.
          </p>
          <p>
            {assessment?.kind === "final_exam"
              ? "Final answer details are withheld to protect the question bank."
              : "This result records only this assessment attempt."}
          </p>
          <Link
            className="button secondary"
            href={`/schools/${slug}/courses/${enrollmentId}`}
          >
            Return to course
          </Link>
        </section>
      )}
    </main>
  );
}

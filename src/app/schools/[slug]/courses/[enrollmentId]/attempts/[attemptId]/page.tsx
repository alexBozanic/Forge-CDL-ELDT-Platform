import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { submitAssessment } from "./actions";
type SelectedQuestion = {
  question_id: string;
  prompt: string;
  options: { option_id: string; text: string }[];
};
export default async function AttemptPage({
  params,
}: {
  params: Promise<{ slug: string; enrollmentId: string; attemptId: string }>;
}) {
  const { slug, enrollmentId, attemptId } = await params;
  const { supabase } = await requireUser();
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
      <h1>Attempt result</h1>
      {attempt.status === "in_progress" ? (
        <form action={submitAssessment} className="form-stack">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="enrollmentId" value={enrollmentId} />
          <input type="hidden" name="attemptId" value={attempt.id} />
          {questions.map((question, index) => (
            <fieldset className="panel" key={question.question_id}>
              <legend>
                {index + 1}. {question.prompt}
              </legend>
              {question.options.map((option) => (
                <label className="answer-option" key={option.option_id}>
                  <input
                    type="radio"
                    name={`question:${question.question_id}`}
                    value={option.option_id}
                    required
                  />
                  {option.text}
                </label>
              ))}
            </fieldset>
          ))}
          <button className="button">Submit answers for server scoring</button>
        </form>
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

export type SelectedQuestion = {
  question_id: string;
  prompt: string;
  options: { option_id: string; text: string }[];
};
export type SubmissionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  submitted?: boolean;
};
type Attempt = {
  id: string;
  enrollment_id: string;
  status: string;
  questions?: SelectedQuestion[] | null;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const terminalStatuses = new Set(["passed", "failed", "expired"]);
const failure =
  "We could not confirm your submission. Your choices remain on this page. Open the attempt status in a new tab to check whether a result was saved before trying again. No automatic retry was made.";

// Callbacks use the caller's authenticated client. The database still owns
// authorization, deadlines, scoring and the final immutable result.
export async function submitAttempt(
  form: FormData,
  load: (id: string) => PromiseLike<{ data: Attempt | null; error: unknown }>,
  save: (payload: {
    target_attempt_id: string;
    submitted_answers: Record<string, string>;
  }) => PromiseLike<{ data: { status?: string } | null; error: unknown }>,
): Promise<SubmissionState> {
  const attemptId = form.get("attemptId"),
    enrollmentId = form.get("enrollmentId"),
    slug = form.get("slug");
  if (
    typeof attemptId !== "string" ||
    !uuid.test(attemptId) ||
    typeof enrollmentId !== "string" ||
    !uuid.test(enrollmentId) ||
    typeof slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  )
    return { error: "Reopen this assessment from your course to continue." };
  try {
    const { data: attempt, error } = await load(attemptId);
    if (error) return { error: failure };
    if (
      !attempt ||
      attempt.id !== attemptId ||
      attempt.enrollment_id !== enrollmentId
    )
      return { error: "This attempt is unavailable. Return to your course." };
    // A lost response may follow a commit: read terminal results without a write.
    if (terminalStatuses.has(attempt.status)) return { submitted: true };
    if (attempt.status !== "in_progress" || !attempt.questions?.length)
      return { error: "This attempt is unavailable. Return to your course." };
    const allowed = new Map(attempt.questions.map((q) => [q.question_id, q]));
    for (const [name] of form.entries())
      if (name.startsWith("question:") && !allowed.has(name.slice(9)))
        return {
          error:
            "The answers do not match this attempt. Check its status before continuing.",
        };
    const answers: Record<string, string> = {},
      fieldErrors: Record<string, string> = {};
    for (const question of attempt.questions) {
      const values = form.getAll(`question:${question.question_id}`);
      if (
        values.length !== 1 ||
        typeof values[0] !== "string" ||
        !question.options.some((option) => option.option_id === values[0])
      )
        fieldErrors[question.question_id] = "Choose one of the listed answers.";
      else answers[question.question_id] = values[0];
    }
    if (Object.keys(fieldErrors).length)
      return {
        error: "Check the highlighted questions. Your choices have been kept.",
        fieldErrors,
      };
    const result = await save({
      target_attempt_id: attemptId,
      submitted_answers: answers,
    });
    if (result.error || !terminalStatuses.has(result.data?.status ?? ""))
      return { error: failure };
    return { submitted: true };
  } catch {
    return { error: failure };
  }
}

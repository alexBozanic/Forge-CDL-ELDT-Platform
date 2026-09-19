export const startFailure =
  "We could not confirm whether the assessment started. Check your course for an existing attempt before trying again. No automatic retry was made.";
export type AssessmentStartState = { error?: string; attemptId?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The request key is generated for the rendered form, not each submission.
// Only the authenticated RPC authorizes enrollment and checks prerequisites.
export async function requestAssessmentStart(
  form: FormData,
  requestKey: string,
  start: (payload: {
    target_enrollment_id: string;
    target_assessment_id: string;
    request_idempotency_key: string;
  }) => PromiseLike<{
    data: { attempt_id?: string } | null;
    error: { code?: string } | null;
  }>,
): Promise<AssessmentStartState> {
  const enrollmentId = form.get("enrollmentId"),
    assessmentId = form.get("assessmentId"),
    slug = form.get("slug");
  if (
    typeof enrollmentId !== "string" ||
    !uuid.test(enrollmentId) ||
    typeof assessmentId !== "string" ||
    !uuid.test(assessmentId) ||
    !uuid.test(requestKey) ||
    typeof slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  )
    return { error: "Reopen this assessment from your course to continue." };
  try {
    const { data, error } = await start({
      target_enrollment_id: enrollmentId,
      target_assessment_id: assessmentId,
      request_idempotency_key: requestKey,
    });
    if (error)
      return {
        error:
          error.code === "55000"
            ? "This assessment is not ready to start. Return to your course and check that all required lessons are complete."
            : error.code === "42501"
              ? "This assessment is unavailable for your current enrollment. Return to your course."
              : startFailure,
      };
    if (!data?.attempt_id || !uuid.test(data.attempt_id))
      return { error: startFailure };
    return { attemptId: data.attempt_id };
  } catch {
    return { error: startFailure };
  }
}

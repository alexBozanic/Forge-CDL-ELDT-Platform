export type LessonInteractionState = { error?: string; saved?: boolean };
export const lessonSaveFailure =
  "We could not confirm that your lesson progress was saved. Check your course progress before trying again. No automatic retry was made.";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type LessonInteractionRequest = {
  target_enrollment_id: string;
  target_lesson_id: string;
  target_interaction_type: "opened" | "position_saved" | "completed";
  target_resume_position: number;
  request_idempotency_key: string;
};

// Validation is only a boundary check. The authenticated RPC remains responsible
// for enrollment ownership, pinned lesson membership and append-only history.
export async function saveLessonInteraction(
  payload: LessonInteractionRequest,
  save: (
    payload: LessonInteractionRequest,
  ) => PromiseLike<{ error: { code?: string } | null }>,
): Promise<LessonInteractionState> {
  if (
    ![
      payload.target_enrollment_id,
      payload.target_lesson_id,
      payload.request_idempotency_key,
    ].every((value) => typeof value === "string" && uuid.test(value)) ||
    !["opened", "position_saved", "completed"].includes(
      payload.target_interaction_type,
    ) ||
    !Number.isInteger(payload.target_resume_position) ||
    payload.target_resume_position < 0 ||
    payload.target_resume_position > 2147483647
  )
    return {
      error: "Reopen this lesson from your course before saving progress.",
    };
  try {
    const { error } = await save(payload);
    if (error)
      return {
        error:
          error.code === "42501"
            ? "This lesson is unavailable for your current enrollment. Return to your course."
            : lessonSaveFailure,
      };
    return { saved: true };
  } catch {
    return { error: lessonSaveFailure };
  }
}

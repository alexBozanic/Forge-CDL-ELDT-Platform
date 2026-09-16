"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { saveLessonInteraction } from "@/lib/lesson-interaction";

export async function recordLessonInteraction(
  enrollmentId: string,
  lessonId: string,
  interactionType: "opened" | "position_saved" | "completed",
  resumePosition: number,
  idempotencyKey: string,
) {
  const { supabase } = await requireUser();
  const state = await saveLessonInteraction(
    {
      target_enrollment_id: enrollmentId,
      target_lesson_id: lessonId,
      target_interaction_type: interactionType,
      target_resume_position: resumePosition,
      request_idempotency_key: idempotencyKey,
    },
    (payload) => supabase.rpc("record_lesson_interaction", payload),
  );
  if (state.saved) revalidatePath("/schools", "layout");
  return state;
}

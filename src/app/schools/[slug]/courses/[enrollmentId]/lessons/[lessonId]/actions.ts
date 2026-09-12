"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

export async function recordLessonInteraction(
  enrollmentId: string,
  lessonId: string,
  interactionType: "opened" | "position_saved" | "completed",
  resumePosition: number,
  idempotencyKey: string,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("record_lesson_interaction", {
    target_enrollment_id: enrollmentId,
    target_lesson_id: lessonId,
    target_interaction_type: interactionType,
    target_resume_position: resumePosition,
    request_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  revalidatePath("/schools", "layout");
}

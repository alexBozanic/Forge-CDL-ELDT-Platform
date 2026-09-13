"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { requiredString } from "@/lib/forms";
export async function submitAssessment(formData: FormData) {
  const { supabase } = await requireUser();
  const attemptId = requiredString(formData, "attemptId");
  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries())
    if (key.startsWith("question:") && typeof value === "string")
      answers[key.slice(9)] = value;
  const { error } = await supabase.rpc("submit_assessment", {
    target_attempt_id: attemptId,
    submitted_answers: answers,
  });
  if (error) throw error;
  revalidatePath(
    `/schools/${requiredString(formData, "slug")}/courses/${requiredString(formData, "enrollmentId")}/attempts/${attemptId}`,
  );
}

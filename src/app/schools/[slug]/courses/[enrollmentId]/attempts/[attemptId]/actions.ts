"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  submitAttempt,
  type SubmissionState,
} from "@/lib/assessment-submission";
export async function submitAssessment(
  _state: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  const { supabase } = await requireUser();
  const state = await submitAttempt(
    formData,
    (id) => supabase.rpc("get_assessment_attempt", { target_attempt_id: id }),
    (payload) => supabase.rpc("submit_assessment", payload),
  );
  if (state.submitted) {
    const coursePath = `/schools/${formData.get("slug")}/courses/${formData.get("enrollmentId")}`;
    revalidatePath(`${coursePath}/attempts/${formData.get("attemptId")}`);
    revalidatePath(coursePath);
  }
  return state;
}

"use server";
import { loadSchoolEnrollment } from "@/lib/school-enrollment";
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
  const { supabase, user } = await requireUser();
  const state = await submitAttempt(
    formData,
    async (id) => {
      const enrollment = await loadSchoolEnrollment(
        supabase,
        formData.get("slug"),
        formData.get("enrollmentId"),
        user.id,
      );
      if (!enrollment) return { data: null, error: "Unavailable enrollment" };
      return supabase.rpc("get_assessment_attempt", { target_attempt_id: id });
    },
    (payload) => supabase.rpc("submit_assessment", payload),
  );
  if (state.submitted) {
    const coursePath = `/schools/${formData.get("slug")}/courses/${formData.get("enrollmentId")}`;
    revalidatePath(`${coursePath}/attempts/${formData.get("attemptId")}`);
    revalidatePath(coursePath);
  }
  return state;
}

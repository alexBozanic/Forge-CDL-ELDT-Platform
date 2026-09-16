"use server";
import { loadSchoolEnrollment } from "@/lib/school-enrollment";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  requestAssessmentStart,
  type AssessmentStartState,
} from "@/lib/assessment-start";

export async function startAssessment(
  requestKey: string,
  _state: AssessmentStartState,
  formData: FormData,
): Promise<AssessmentStartState> {
  const { supabase, user } = await requireUser();
  const state = await requestAssessmentStart(
    formData,
    requestKey,
    async (payload) => {
      const enrollment = await loadSchoolEnrollment(
        supabase,
        formData.get("slug"),
        formData.get("enrollmentId"),
        user.id,
      );
      if (!enrollment) return { data: null, error: { code: "42501" } };
      return supabase.rpc("start_assessment", payload);
    },
  );
  if (!state.attemptId) return state;
  redirect(
    `/schools/${formData.get("slug")}/courses/${formData.get("enrollmentId")}/attempts/${state.attemptId}`,
  );
}

"use server";
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
  const { supabase } = await requireUser();
  const state = await requestAssessmentStart(formData, requestKey, (payload) =>
    supabase.rpc("start_assessment", payload),
  );
  if (!state.attemptId) return state;
  redirect(
    `/schools/${formData.get("slug")}/courses/${formData.get("enrollmentId")}/attempts/${state.attemptId}`,
  );
}

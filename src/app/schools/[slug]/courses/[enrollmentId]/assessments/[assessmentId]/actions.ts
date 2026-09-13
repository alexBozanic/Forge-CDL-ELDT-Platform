"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requiredString } from "@/lib/forms";

export async function startAssessment(formData: FormData) {
  const { supabase } = await requireUser();
  const slug = requiredString(formData, "slug");
  const enrollmentId = requiredString(formData, "enrollmentId");
  const { data, error } = await supabase.rpc("start_assessment", {
    target_enrollment_id: enrollmentId,
    target_assessment_id: requiredString(formData, "assessmentId"),
    request_idempotency_key: randomUUID(),
  });
  if (error) throw error;
  const attemptId = (data as { attempt_id?: string } | null)?.attempt_id;
  if (!attemptId) throw new Error("Assessment could not be started");
  redirect(`/schools/${slug}/courses/${enrollmentId}/attempts/${attemptId}`);
}

"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { requiredString } from "@/lib/forms";
async function call(name: string, values: Record<string, unknown>) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc(name, values);
  if (error) throw error;
}
export async function updateReportingIdentifiers(formData: FormData) {
  const slug = requiredString(formData, "slug");
  await call("update_reporting_identifiers", {
    target_organization_id: requiredString(formData, "organizationId"),
    target_student_user_id: requiredString(formData, "studentUserId"),
    student_date_of_birth: requiredString(formData, "dateOfBirth"),
    student_license_or_permit_number: requiredString(formData, "licenseNumber"),
    student_issuing_jurisdiction: requiredString(formData, "jurisdiction"),
    organization_provider_identifier: requiredString(
      formData,
      "providerIdentifier",
    ),
  });
  revalidatePath(`/schools/${slug}/reporting`);
}
export async function prepareReporting(formData: FormData) {
  const slug = requiredString(formData, "slug");
  await call("prepare_reporting_record", {
    target_reporting_record_id: requiredString(formData, "reportingId"),
    request_idempotency_key: randomUUID(),
  });
  revalidatePath(`/schools/${slug}/reporting`);
}
export async function transitionReporting(formData: FormData) {
  const slug = requiredString(formData, "slug");
  await call("transition_reporting", {
    target_reporting_record_id: requiredString(formData, "reportingId"),
    target_status: requiredString(formData, "status"),
    transition_reason: requiredString(formData, "reason"),
    request_idempotency_key: randomUUID(),
  });
  revalidatePath(`/schools/${slug}/reporting`);
}

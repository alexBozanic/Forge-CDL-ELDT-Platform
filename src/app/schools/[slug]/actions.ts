"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/auth";
import { optionalString, requiredString } from "@/lib/forms";
import { saveSchoolMutation, type SchoolMutation } from "@/lib/school-mutation";

export type InvitationState = { token?: string; error?: string };

export async function createInvitation(
  _state: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const { supabase } = await getAuthorizationContext();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const organizationId = requiredString(formData, "organizationId");
  const { error } = await supabase.rpc("create_student_invitation", {
    target_organization_id: organizationId,
    invitation_email: requiredString(formData, "email").toLowerCase(),
    invitation_token_hash: tokenHash,
    invitation_expires_at: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    target_assignment_id: optionalString(formData, "assignmentId"),
  });
  if (error)
    return {
      error:
        "Invitation could not be created. Check the email, assignment, and existing pending invitations.",
    };
  revalidatePath(`/schools/${requiredString(formData, "slug")}`);
  return { token };
}

async function schoolMutation(operation: SchoolMutation, form: FormData) {
  const { supabase } = await getAuthorizationContext();
  const state = await saveSchoolMutation(operation, form, (name, payload) =>
    supabase.rpc(name, payload),
  );
  if (state.success)
    revalidatePath(`/schools/${String(form.get("slug")).trim()}`);
  return state;
}
export async function updateSchoolSettings(form: FormData) {
  return schoolMutation("settings", form);
}
export async function revokeInvitation(form: FormData) {
  return schoolMutation("revokeInvitation", form);
}
export async function createAssignment(form: FormData) {
  return schoolMutation("createAssignment", form);
}
export async function withdrawAssignment(form: FormData) {
  return schoolMutation("withdrawAssignment", form);
}

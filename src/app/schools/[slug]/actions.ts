"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/auth";
import { requestInvitation } from "@/lib/invitation-request";
import { saveSchoolMutation, type SchoolMutation } from "@/lib/school-mutation";

export type InvitationState = { token?: string; error?: string };

export async function createInvitation(
  _state: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const { supabase } = await getAuthorizationContext();
  const state = await requestInvitation(
    "student",
    formData,
    async ({ organizationId, email, assignmentId }) => {
      const token = randomBytes(32).toString("base64url");
      const { error } = await supabase.rpc("create_student_invitation", {
        target_organization_id: organizationId,
        invitation_email: email,
        invitation_token_hash: createHash("sha256").update(token).digest("hex"),
        invitation_expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        target_assignment_id: assignmentId,
      });
      return error ? { error: "Invitation failed" } : { token };
    },
  );
  if (state.token)
    revalidatePath(`/schools/${String(formData.get("slug")).trim()}`);
  return state;
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

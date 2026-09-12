"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/auth";
import { optionalString, requiredString } from "@/lib/forms";

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

export async function updateSchoolSettings(formData: FormData) {
  const { supabase } = await getAuthorizationContext();
  const slug = requiredString(formData, "slug");
  const { error } = await supabase.rpc("update_organization_settings", {
    target_organization_id: requiredString(formData, "organizationId"),
    organization_name: requiredString(formData, "name"),
    organization_email: optionalString(formData, "email") ?? "",
    primary_color: requiredString(formData, "primaryColor"),
    accent_color: requiredString(formData, "accentColor"),
  });
  if (error) throw error;
  revalidatePath(`/schools/${slug}`);
}

export async function revokeInvitation(formData: FormData) {
  const { supabase } = await getAuthorizationContext();
  const slug = requiredString(formData, "slug");
  const { error } = await supabase.rpc("revoke_invitation", {
    target_invitation_id: requiredString(formData, "invitationId"),
  });
  if (error) throw error;
  revalidatePath(`/schools/${slug}`);
}

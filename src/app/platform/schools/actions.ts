"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/auth";
import { optionalString, requiredString } from "@/lib/forms";

export type AdminInvitationState = { token?: string; error?: string };

export async function createSchool(formData: FormData) {
  const { supabase, isPlatformAdministrator } = await getAuthorizationContext();
  if (!isPlatformAdministrator)
    throw new Error("Platform administrator required");
  const { error } = await supabase.rpc("create_organization", {
    organization_name: requiredString(formData, "name"),
    organization_slug: requiredString(formData, "slug"),
    organization_email: optionalString(formData, "email"),
  });
  if (error) throw error;
  revalidatePath("/platform/schools");
}

export async function createSchoolAdminInvitation(
  _state: AdminInvitationState,
  formData: FormData,
): Promise<AdminInvitationState> {
  const { supabase, isPlatformAdministrator } = await getAuthorizationContext();
  if (!isPlatformAdministrator)
    return { error: "Platform administrator required." };
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.rpc("create_school_admin_invitation", {
    target_organization_id: requiredString(formData, "organizationId"),
    invitation_email: requiredString(formData, "email").toLowerCase(),
    invitation_token_hash: tokenHash,
    invitation_expires_at: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  });
  return error
    ? { error: "Administrator invitation could not be created." }
    : { token };
}

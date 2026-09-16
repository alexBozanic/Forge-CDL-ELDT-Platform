"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/auth";
import { requestInvitation } from "@/lib/invitation-request";
import { createSchoolRecord } from "@/lib/platform-creation";

export type AdminInvitationState = { token?: string; error?: string };

export async function createSchool(form: FormData) {
  const { supabase, isPlatformAdministrator } = await getAuthorizationContext();
  if (!isPlatformAdministrator)
    return { error: "Platform administrator access is required." };
  const state = await createSchoolRecord(form, (name, payload) =>
    supabase.rpc(name, payload),
  );
  if (state.success) revalidatePath("/platform/schools");
  return state;
}

export async function createSchoolAdminInvitation(
  _state: AdminInvitationState,
  formData: FormData,
): Promise<AdminInvitationState> {
  const { supabase, isPlatformAdministrator } = await getAuthorizationContext();
  if (!isPlatformAdministrator)
    return { error: "Platform administrator required." };
  return requestInvitation(
    "administrator",
    formData,
    async ({ organizationId, email }) => {
      const token = randomBytes(32).toString("base64url");
      const { error } = await supabase.rpc("create_school_admin_invitation", {
        target_organization_id: organizationId,
        invitation_email: email,
        invitation_token_hash: createHash("sha256").update(token).digest("hex"),
        invitation_expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
      return error ? { error: "Invitation failed" } : { token };
    },
  );
}

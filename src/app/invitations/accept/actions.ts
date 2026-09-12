"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requiredString } from "@/lib/forms";

export async function acceptInvitation(formData: FormData) {
  const { supabase } = await requireUser();
  const tokenHash = createHash("sha256")
    .update(requiredString(formData, "token"))
    .digest("hex");
  const { error } = await supabase.rpc("accept_student_invitation", {
    invitation_token_hash: tokenHash,
  });
  if (error) redirect("/invitations/accept?error=invalid");
  redirect("/dashboard");
}

"use server";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { redeemInvitation } from "@/lib/auth-action";
export async function acceptInvitation(form: FormData) {
  const { supabase } = await requireUser();
  const state = await redeemInvitation(form, (token) =>
    supabase.rpc("accept_student_invitation", {
      invitation_token_hash: createHash("sha256").update(token).digest("hex"),
    }),
  );
  if (state.complete) redirect("/dashboard");
  return state;
}

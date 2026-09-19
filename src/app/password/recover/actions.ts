"use server";
import { redirect } from "next/navigation";
import { runAuthAction } from "@/lib/auth-action";
import { getSiteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function requestPasswordRecovery(form: FormData) {
  const state = await runAuthAction("recover", form, async ({ email }) => {
    const supabase = await createSupabaseServerClient(true);
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/confirm?next=/password/update`,
    });
  });
  if (state.complete) redirect("/password/recover?sent=1");
  return state;
}

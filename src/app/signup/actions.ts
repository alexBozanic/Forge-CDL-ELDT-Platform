"use server";
import { redirect } from "next/navigation";
import { runAuthAction } from "@/lib/auth-action";
import { getSiteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function signup(form: FormData) {
  const state = await runAuthAction(
    "signup",
    form,
    async ({ email, password }) => {
      const supabase = await createSupabaseServerClient(true);
      return supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=/invitations/accept`,
        },
      });
    },
  );
  if (state.complete) redirect("/signup?sent=1");
  return state;
}

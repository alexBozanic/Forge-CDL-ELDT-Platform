"use server";
import { redirect } from "next/navigation";
import { runAuthAction } from "@/lib/auth-action";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function login(form: FormData) {
  const state = await runAuthAction(
    "login",
    form,
    async ({ email, password }) => {
      const supabase = await createSupabaseServerClient(true);
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (result.error) return result;
      const validation = await supabase.auth.getUser();
      return { error: validation.error || !validation.data.user };
    },
  );
  if (state.complete) redirect("/dashboard");
  return state;
}
export async function logout() {
  const state = await runAuthAction("logout", new FormData(), async () => {
    const supabase = await createSupabaseServerClient(true);
    return supabase.auth.signOut();
  });
  if (state.complete) redirect("/login");
  return state;
}

"use server";

import { redirect } from "next/navigation";
import { requiredString } from "@/lib/forms";
import { getSiteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const email = requiredString(formData, "email").toLowerCase();
  const password = requiredString(formData, "password");
  if (password.length < 12) redirect("/signup?error=password");
  const supabase = await createSupabaseServerClient(true);
  await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=/invitations/accept`,
    },
  });
  redirect("/signup?sent=1");
}

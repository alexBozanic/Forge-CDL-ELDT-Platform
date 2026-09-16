"use server";
import { readPassword } from "@/lib/password-input";

import { redirect } from "next/navigation";
import { requiredString } from "@/lib/forms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createSupabaseServerClient(true);
  const email = requiredString(formData, "email").toLowerCase();
  const password = readPassword(formData);
  if (password === null) redirect("/login?error=invalid");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=invalid");
  const { data, error: validationError } = await supabase.auth.getUser();
  if (validationError || !data.user) redirect("/login?error=invalid");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createSupabaseServerClient(true);
  await supabase.auth.signOut();
  redirect("/login");
}

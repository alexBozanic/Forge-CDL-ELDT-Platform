"use server";
import { readPassword } from "@/lib/password-input";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function updatePassword(formData: FormData) {
  const password = readPassword(formData);
  if (password === null || password.length < 12)
    redirect("/password/update?error=password");
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/password/update?error=update");
  redirect("/dashboard");
}

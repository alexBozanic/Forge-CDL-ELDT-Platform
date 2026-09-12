"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requiredString } from "@/lib/forms";

export async function updatePassword(formData: FormData) {
  const password = requiredString(formData, "password");
  if (password.length < 12) redirect("/password/update?error=password");
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/password/update?error=update");
  redirect("/dashboard");
}

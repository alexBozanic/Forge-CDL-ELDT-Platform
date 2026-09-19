"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { runAuthAction } from "@/lib/auth-action";
export async function updatePassword(form: FormData) {
  const { supabase } = await requireUser();
  const state = await runAuthAction("update", form, ({ password }) =>
    supabase.auth.updateUser({ password }),
  );
  if (state.complete) redirect("/dashboard");
  return state;
}

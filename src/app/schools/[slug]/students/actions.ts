"use server";
import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/auth";
import { saveSchoolMutation } from "@/lib/school-mutation";
export async function enrollStudent(form: FormData) {
  const { supabase } = await getAuthorizationContext();
  const state = await saveSchoolMutation(
    "enrollStudent",
    form,
    (name, payload) => supabase.rpc(name, payload),
  );
  if (state.success)
    revalidatePath(
      `/schools/${String(form.get("slug")).trim()}/students/${String(form.get("userId")).trim()}`,
    );
  return state;
}

"use server";
import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/auth";
import { submitProfile, type ProfileState } from "@/lib/student-profile";
export async function saveProfile(
  _state: ProfileState,
  form: FormData,
): Promise<ProfileState> {
  const { supabase } = await getAuthorizationContext();
  const state = await submitProfile(form, (payload) =>
    supabase.rpc("save_student_profile", payload),
  );
  if (state.saved) {
    const slug = form.get("slug") as string;
    const userId = (form.get("userId") as string).trim();
    revalidatePath(`/schools/${slug}`);
    revalidatePath(`/schools/${slug}/profile`);
    revalidatePath(`/schools/${slug}/students/${userId}`);
  }
  return state;
}

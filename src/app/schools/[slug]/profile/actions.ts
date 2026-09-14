"use server";
import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/auth";
import { optionalString, requiredString } from "@/lib/forms";
export type ProfileState = { error?: string; saved?: boolean };
export async function saveProfile(
  _state: ProfileState,
  form: FormData,
): Promise<ProfileState> {
  const { supabase } = await getAuthorizationContext();
  const slug = requiredString(form, "slug");
  const userId = requiredString(form, "userId");
  const { error } = await supabase.rpc("save_student_profile", {
    target_organization_id: requiredString(form, "organizationId"),
    target_student_user_id: userId,
    first_name: optionalString(form, "firstName"),
    middle_name: optionalString(form, "middleName"),
    last_name: optionalString(form, "lastName"),
    birth_date: optionalString(form, "birthDate"),
    permit_number: optionalString(form, "permitNumber"),
    jurisdiction: optionalString(form, "jurisdiction"),
  });
  if (error)
    return {
      error:
        error.code === "42501"
          ? "An active student membership and profile access are required."
          : "Profile could not be saved. Check the fields and try again. If this continues, contact your school administrator.",
    };
  revalidatePath(`/schools/${slug}`);
  revalidatePath(`/schools/${slug}/profile`);
  revalidatePath(`/schools/${slug}/students/${userId}`);
  return { saved: true };
}

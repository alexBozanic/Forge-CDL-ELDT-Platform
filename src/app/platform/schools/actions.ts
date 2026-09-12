"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/auth";
import { optionalString, requiredString } from "@/lib/forms";

export async function createSchool(formData: FormData) {
  const { supabase, isPlatformAdministrator } = await getAuthorizationContext();
  if (!isPlatformAdministrator)
    throw new Error("Platform administrator required");
  const { error } = await supabase.rpc("create_organization", {
    organization_name: requiredString(formData, "name"),
    organization_slug: requiredString(formData, "slug"),
    organization_email: optionalString(formData, "email"),
  });
  if (error) throw error;
  revalidatePath("/platform/schools");
}

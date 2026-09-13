"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/auth";
import { requiredString } from "@/lib/forms";

export async function enrollStudent(formData: FormData) {
  const { supabase } = await getAuthorizationContext();
  const slug = requiredString(formData, "slug");
  const userId = requiredString(formData, "userId");
  const { error } = await supabase.rpc("create_student_enrollment", {
    target_organization_id: requiredString(formData, "organizationId"),
    target_student_user_id: userId,
    target_assignment_id: requiredString(formData, "assignmentId"),
  });
  if (error) throw error;
  revalidatePath(`/schools/${slug}/students/${userId}`);
}

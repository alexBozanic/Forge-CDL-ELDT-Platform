import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadStudentMembership(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId,
    )
  )
    return null;
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("user_id, status, created_at")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("role", "student")
    .maybeSingle();
  // A missing record is expected; a database failure remains an error state.
  if (error) throw new Error("Student membership could not be loaded.");
  return data;
}

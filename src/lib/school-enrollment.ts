import type { SupabaseClient } from "@supabase/supabase-js";
// Route context is checked in addition to the database's identity/RLS guards.
export async function loadSchoolEnrollment(
  supabase: SupabaseClient,
  slug: unknown,
  enrollmentId: unknown,
  userId: string,
) {
  if (
    typeof slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    typeof enrollmentId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      enrollmentId,
    )
  )
    return null;
  try {
    const org = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .single();
    if (org.error || !org.data) return null;
    const result = await supabase
      .from("enrollments")
      .select("id, course_version_id, status")
      .eq("id", enrollmentId)
      .eq("organization_id", org.data.id)
      .eq("student_user_id", userId)
      .single();
    return result.error ? null : result.data;
  } catch {
    return null;
  }
}

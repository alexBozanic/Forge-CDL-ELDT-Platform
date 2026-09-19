import type { SupabaseClient } from "@supabase/supabase-js";

// Use the authenticated client for both lookups. A globally authorized viewer
// must still request the completion through its actual school's route.
export async function loadSchoolTranscript(
  supabase: SupabaseClient,
  slug: string,
  completionId: string,
) {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .single();
  if (organizationError || !organization) return null;

  const { data: completion, error: completionError } = await supabase
    .from("course_completions")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("id", completionId)
    .single();
  if (completionError || !completion) return null;

  const { data, error } = await supabase.rpc("get_training_transcript", {
    target_completion_id: completion.id,
  });
  return error ? null : data;
}

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
}

export async function getAuthorizationContext() {
  const { supabase, user } = await requireUser();
  const [platformResult, membershipResult] = await Promise.all([
    supabase
      .from("platform_administrators")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("organization_memberships")
      .select("organization_id, role, status, organizations(slug, name)")
      .eq("user_id", user.id),
  ]);

  if (platformResult.error) throw platformResult.error;
  if (membershipResult.error) throw membershipResult.error;

  return {
    supabase,
    user,
    isPlatformAdministrator: Boolean(platformResult.data),
    memberships: membershipResult.data ?? [],
  };
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth";
import { ProfileForm } from "./profile-form";
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, user, memberships } = await getAuthorizationContext();
  const membership = memberships.find((item) => {
    const org = Array.isArray(item.organizations)
      ? item.organizations[0]
      : item.organizations;
    return (
      org?.slug === slug && item.status === "active" && item.role === "student"
    );
  });
  if (!membership) notFound();
  const org = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;
  if (!org) notFound();
  const { data: profile, error } = await supabase
    .from("student_profiles")
    .select(
      "legal_first_name,legal_middle_name,legal_last_name,date_of_birth,license_or_permit_number,issuing_jurisdiction",
    )
    .eq("organization_id", membership.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return (
    <main className="container main" id="main-content">
      <Link href={`/schools/${slug}`}>School workspace</Link>
      <h1>Your profile</h1>
      <ProfileForm
        organizationId={membership.organization_id}
        userId={user.id}
        slug={slug}
        profile={profile}
      />
    </main>
  );
}

import { getAuthorizationContext } from "@/lib/auth";
function csv(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { supabase, isPlatformAdministrator, memberships } =
    await getAuthorizationContext();
  const allowed =
    isPlatformAdministrator ||
    memberships.some((m) => {
      const o = Array.isArray(m.organizations)
        ? m.organizations[0]
        : m.organizations;
      return (
        o?.slug === slug && m.role === "school_admin" && m.status === "active"
      );
    });
  if (!allowed) return new Response("Not found", { status: 404 });
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .single();
  if (!org) return new Response("Not found", { status: 404 });
  const { data, error } = await supabase
    .from("reporting_records")
    .select(
      "id,status,created_at,reporting_identity_snapshot,provider_snapshot,course_completions(completed_at,course_manifest_hash,course_versions(title,version_number),assessment_attempts(score_percent,submitted_at))",
    )
    .eq("organization_id", org.id);
  if (error) throw error;
  const header = [
    "record_id",
    "status",
    "student_name",
    "course",
    "version",
    "score_percent",
    "completed_at",
    "manifest_hash",
    "provider_identifier",
  ];
  const rows = (data ?? []).map((r) => {
    const c = Array.isArray(r.course_completions)
      ? r.course_completions[0]
      : r.course_completions;
    const v = Array.isArray(c?.course_versions)
      ? c?.course_versions[0]
      : c?.course_versions;
    const a = Array.isArray(c?.assessment_attempts)
      ? c?.assessment_attempts[0]
      : c?.assessment_attempts;
    const identity = r.reporting_identity_snapshot as Record<
      string,
      string | null
    >;
    const provider = r.provider_snapshot as Record<string, string | null>;
    return [
      r.id,
      r.status,
      [
        identity.legal_first_name,
        identity.legal_middle_name,
        identity.legal_last_name,
      ]
        .filter(Boolean)
        .join(" "),
      v?.title,
      v?.version_number,
      a?.score_percent,
      c?.completed_at,
      c?.course_manifest_hash,
      provider.provider_identifier,
    ]
      .map(csv)
      .join(",");
  });
  return new Response([header.map(csv).join(","), ...rows].join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}-reporting.csv"`,
      "cache-control": "private, no-store",
    },
  });
}

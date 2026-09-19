import { loadReportingExport } from "@/lib/reporting-export";
import { getAuthorizationContext } from "@/lib/auth";
import { reportingCsvCell as csv } from "@/lib/reporting-csv";
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
  const exported = await loadReportingExport(
    supabase,
    org.id,
    new Date().toISOString(),
  );
  if (exported.error) return exportFailure(exported.error);
  const { rows: data, versions } = exported;
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
    const v = c ? versions.get(c.course_version_id) : undefined;
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

function exportFailure(reason: "unavailable" | "too_large") {
  return new Response(
    reason === "too_large"
      ? "This export exceeds the current 10,000-record limit. Contact support for a larger export. No partial file was generated."
      : "The export could not be completed. Try again later. No partial file was generated.",
    {
      status: reason === "too_large" ? 413 : 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "private, no-store",
      },
    },
  );
}

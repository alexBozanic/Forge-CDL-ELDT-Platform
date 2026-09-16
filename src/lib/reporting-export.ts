import type { SupabaseClient } from "@supabase/supabase-js";
import { readExportPages, exportPageSize } from "./export-pagination.ts";
export async function loadReportingExport(
  supabase: SupabaseClient,
  organizationId: string,
  cutoff: string,
) {
  const exported = await readExportPages((after) => {
    let query = supabase
      .from("reporting_records")
      .select(
        "id,status,created_at,reporting_identity_snapshot,provider_snapshot,course_completions(completed_at,course_manifest_hash,course_version_id,assessment_attempts(score_percent,submitted_at))",
      )
      .eq("organization_id", organizationId)
      .lte("created_at", cutoff)
      .order("id", { ascending: true })
      .limit(exportPageSize);
    if (after) query = query.gt("id", after);
    return query;
  });
  if (exported.error) return { error: exported.error };
  const data = exported.rows;
  // Completions have no direct foreign key to course_versions.
  // Resolve only versions referenced by this tenant's RLS-filtered records.
  const versionIds = [
    ...new Set(
      (data ?? []).flatMap((record) => {
        const completion = Array.isArray(record.course_completions)
          ? record.course_completions[0]
          : record.course_completions;
        return completion ? [completion.course_version_id] : [];
      }),
    ),
  ];
  const versions = new Map<string, { title: string; version_number: number }>();
  for (let offset = 0; offset < versionIds.length; offset += exportPageSize) {
    const ids = versionIds.slice(offset, offset + exportPageSize);
    const loaded = await readExportPages((after) => {
      let query = supabase
        .from("course_versions")
        .select("id,title,version_number")
        .in("id", ids)
        .order("id", { ascending: true })
        .limit(exportPageSize);
      if (after) query = query.gt("id", after);
      return query;
    });
    if (loaded.error) return { error: loaded.error };
    for (const version of loaded.rows) versions.set(version.id, version);
    // Missing referenced metadata must not produce a deceptively complete CSV.
    if (ids.some((id) => !versions.has(id)))
      return { error: "unavailable" as const };
  }
  return { rows: data, versions };
}

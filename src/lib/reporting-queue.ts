import type { SupabaseClient } from "@supabase/supabase-js";
import { readExportPages } from "./export-pagination.ts";

type Cursor = { created_at: string; id: string };
export const reportingPageSize = 50;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const timestamp =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
function validCursor(value: unknown): value is Cursor {
  if (!value || typeof value !== "object") return false;
  const c = value as Cursor;
  return (
    typeof c.id === "string" &&
    uuid.test(c.id) &&
    typeof c.created_at === "string" &&
    timestamp.test(c.created_at) &&
    Number.isFinite(Date.parse(c.created_at))
  );
}
export function decodeReportingCursor(
  value: string | string[] | undefined,
): Cursor | null {
  if (value === undefined) return null;
  if (
    typeof value !== "string" ||
    value.length > 300 ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  )
    throw new Error("Invalid reporting page.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid reporting page.");
  }
  if (!validCursor(parsed)) throw new Error("Invalid reporting page.");
  return { id: parsed.id, created_at: parsed.created_at };
}
export function encodeReportingCursor(value: Cursor): string {
  if (!validCursor(value)) throw new Error("Invalid reporting page.");
  // Preserve PostgreSQL microseconds; converting through Date loses precision.
  return Buffer.from(
    JSON.stringify({ created_at: value.created_at, id: value.id }),
  ).toString("base64url");
}
export async function loadReportingQueue(
  supabase: SupabaseClient,
  organizationId: string,
  cursor: Cursor | null,
) {
  if (cursor && !validCursor(cursor))
    throw new Error("Invalid reporting page.");
  let query = supabase
    .from("reporting_records")
    .select(
      "id,status,created_at,readiness_issues,reporting_identity_snapshot,provider_snapshot,course_completions(id,student_user_id,completed_at,course_manifest_hash,course_version_id,assessment_attempts(score_percent,submitted_at)),reporting_events(id,from_status,to_status,reason,occurred_at)",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(reportingPageSize);
  if (cursor)
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  const { data: records, error } = await query;
  if (error || !records)
    throw new Error("Reporting records could not be loaded.");
  const ids = [
    ...new Set(
      records.flatMap((record) => {
        const c = Array.isArray(record.course_completions)
          ? record.course_completions[0]
          : record.course_completions;
        return c ? [c.course_version_id] : [];
      }),
    ),
  ];
  const versions = new Map<string, { title: string; version_number: number }>();
  if (ids.length) {
    const result = await readExportPages((after) => {
      let q = supabase
        .from("course_versions")
        .select("id,title,version_number")
        .in("id", ids)
        .order("id", { ascending: true })
        .limit(reportingPageSize);
      if (after) q = q.gt("id", after);
      return q;
    });
    if (result.error)
      throw new Error("Reporting course details could not be loaded.");
    for (const v of result.rows) versions.set(v.id, v);
    if (ids.some((id) => !versions.has(id)))
      throw new Error("Reporting course details could not be loaded.");
  }
  const last = records.at(-1);
  // Always offer continuation on nonempty pages, including smaller API-capped pages.
  return { records, versions, next: last ? encodeReportingCursor(last) : null };
}

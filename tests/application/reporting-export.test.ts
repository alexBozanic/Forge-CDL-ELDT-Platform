import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readExportPages,
  exportRowLimit,
} from "../../src/lib/export-pagination.ts";
import { loadReportingExport } from "../../src/lib/reporting-export.ts";
const id = (n: number) => String(n).padStart(8, "0");

test("export reads past 1000 rows and continues after API-capped short pages", async () => {
  const records = Array.from({ length: 1201 }, (_, i) => ({ id: id(i) }));
  let calls = 0;
  const result = await readExportPages(async (after) => {
    calls++;
    return {
      data: records.filter((r) => after === null || r.id > after).slice(0, 37),
      error: null,
    };
  });
  assert.deepEqual(result, { rows: records });
  assert.equal(calls, 34);
});
test("failed, empty-body or stalled pages never return partial exports", async () => {
  for (const mode of ["throw", "error", "null", "repeat", "unordered"]) {
    let calls = 0;
    const result = await readExportPages(async () => {
      calls++;
      if (calls === 1) return { data: [{ id: "a" }], error: null };
      if (mode === "throw") throw new Error("PRIVATE DETAIL");
      if (mode === "error") return { data: [], error: "PRIVATE DETAIL" };
      if (mode === "null") return { data: null, error: null };
      return {
        data: mode === "repeat" ? [{ id: "a" }] : [{ id: "c" }, { id: "b" }],
        error: null,
      };
    });
    assert.equal(calls, 2);
    assert.deepEqual(result, { error: "unavailable" });
  }
});
test("bounded exports fail explicitly instead of silently truncating", async () => {
  const records = Array.from({ length: exportRowLimit + 1 }, (_, i) => ({
    id: id(i),
  }));
  assert.deepEqual(
    await readExportPages(async (after) => ({
      data: records.filter((r) => !after || r.id > after).slice(0, 200),
      error: null,
    })),
    { error: "too_large" },
  );
  assert.deepEqual(
    await readExportPages(async () => ({ data: [], error: null })),
    { rows: [] },
  );
});

function fixture(missingMetadata = false) {
  const records = Array.from({ length: 1201 }, (_, i) => ({
    id: id(i),
    organization_id: "school-a",
    created_at: "2026-01-01",
    course_completions: { course_version_id: `v${id(i % 205)}` },
  }));
  const versions = Array.from({ length: 205 }, (_, i) => ({
    id: `v${id(i)}`,
    title: "Synthetic",
    version_number: 1,
  }));
  if (missingMetadata) versions.pop();
  const tables: Record<string, Array<Record<string, unknown>>> = {
    reporting_records: [
      ...records,
      { id: "z", organization_id: "school-b", created_at: "2026-01-01" },
      { id: "y", organization_id: "school-a", created_at: "2027-01-01" },
    ],
    course_versions: versions,
  };
  let reportCalls = 0;
  const client = {
    from(table: string) {
      let rows = [...tables[table]],
        limit = 200,
        scoped = false,
        cutoff = false;
      const builder = {
        select() {
          return builder;
        },
        eq(key: string, value: string) {
          if (key === "organization_id") {
            assert.equal(value, "school-a");
            scoped = true;
          }
          rows = rows.filter((r) => r[key] === value);
          return builder;
        },
        lte(key: string, value: string) {
          assert.equal(value, "2026-09-16");
          cutoff = true;
          rows = rows.filter((r) => String(r[key]) <= value);
          return builder;
        },
        gt(key: string, value: string) {
          rows = rows.filter((r) => String(r[key]) > value);
          return builder;
        },
        in(key: string, values: string[]) {
          assert.ok(values.length <= 200);
          rows = rows.filter((r) => values.includes(String(r[key])));
          return builder;
        },
        order(key: string, options: { ascending: boolean }) {
          assert.equal(key, "id");
          assert.equal(options.ascending, true);
          rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));
          return builder;
        },
        limit(count: number) {
          limit = count;
          return builder;
        },
        then(resolve: (value: unknown) => unknown) {
          if (table === "reporting_records") {
            reportCalls++;
            assert.ok(scoped);
            assert.ok(cutoff);
          }
          return Promise.resolve({
            data: rows.slice(0, Math.min(37, limit)),
            error: null,
          }).then(resolve);
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, records, getReportCalls: () => reportCalls };
}
test("report loader scopes every page and batches only referenced version metadata", async () => {
  const f = fixture();
  const result = await loadReportingExport(f.client, "school-a", "2026-09-16");
  assert.equal(result.error, undefined);
  assert.deepEqual(result.rows, f.records);
  assert.equal(result.versions?.size, 205);
  assert.equal(f.getReportCalls(), 34);
});
test("missing referenced version metadata prevents incomplete reporting downloads", async () => {
  const f = fixture(true);
  assert.deepEqual(
    await loadReportingExport(f.client, "school-a", "2026-09-16"),
    { error: "unavailable" },
  );
});

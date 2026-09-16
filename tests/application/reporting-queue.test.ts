import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decodeReportingCursor,
  encodeReportingCursor,
  loadReportingQueue,
} from "../../src/lib/reporting-queue.ts";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const time = "2026-09-16T01:02:03.123456+00:00";
test("reporting cursors preserve microseconds and reject malformed query syntax", () => {
  const c = { id: id(1), created_at: time };
  assert.deepEqual(decodeReportingCursor(encodeReportingCursor(c)), c);
  assert.equal(decodeReportingCursor(undefined), null);
  for (const bad of [
    "",
    ["abc"],
    "x".repeat(301),
    "a,b",
    Buffer.from(
      JSON.stringify({ id: id(1), created_at: time + ",id.gt.0" }),
    ).toString("base64url"),
    Buffer.from(JSON.stringify({ id: "bad", created_at: time })).toString(
      "base64url",
    ),
  ]) {
    assert.throws(() => decodeReportingCursor(bad), /Invalid reporting page/);
  }
});
function fixture(fail = false) {
  const rows = Array.from({ length: 125 }, (_, i) => ({
    id: id(i),
    created_at: i < 60 ? time : "2026-09-17T01:02:03.000001+00:00",
    organization_id: "a",
    course_completions: null,
  }));
  rows.push({
    id: id(999),
    created_at: time,
    organization_id: "b",
    course_completions: null,
  });
  const client = {
    from(table: string) {
      assert.equal(table, "reporting_records");
      let selected = [...rows];
      const orders: string[] = [];
      let scoped = false;
      const q = {
        select() {
          return q;
        },
        eq(key: string, value: string) {
          assert.equal(key, "organization_id");
          assert.equal(value, "a");
          scoped = true;
          selected = selected.filter((r) => r.organization_id === value);
          return q;
        },
        order(key: string, options: { ascending: boolean }) {
          assert.equal(options.ascending, false);
          orders.push(key);
          return q;
        },
        limit(n: number) {
          assert.equal(n, 50);
          return q;
        },
        or(filter: string) {
          const match =
            /^created_at.lt.([^,]+),and\(created_at.eq.([^,]+),id.lt.([^)]+)\)$/.exec(
              filter,
            );
          assert.ok(match);
          assert.equal(match[1], match[2]);
          selected = selected.filter(
            (r) =>
              r.created_at < match[1] ||
              (r.created_at === match[1] && r.id < match[3]),
          );
          return q;
        },
        then(resolve: (value: unknown) => unknown) {
          assert.ok(scoped);
          assert.deepEqual(orders, ["created_at", "id"]);
          selected.sort(
            (a, b) =>
              b.created_at.localeCompare(a.created_at) ||
              b.id.localeCompare(a.id),
          );
          return Promise.resolve({
            data: fail ? null : selected.slice(0, 7),
            error: fail ? "PRIVATE DB DETAIL" : null,
          }).then(resolve);
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
  return { client, rows };
}
test("queue traverses timestamp ties and smaller API pages without omissions or duplicates", async () => {
  const f = fixture();
  let cursor = null;
  const seen: string[] = [];
  for (let page = 0; page < 30; page++) {
    const result = await loadReportingQueue(f.client, "a", cursor);
    seen.push(...result.records.map((r) => r.id));
    if (!result.next) break;
    cursor = decodeReportingCursor(result.next);
    if (page === 0)
      f.rows.push({
        id: id(1000),
        created_at: "2026-09-18T00:00:00+00:00",
        organization_id: "a",
        course_completions: null,
      });
  }
  assert.equal(seen.length, 125);
  assert.equal(new Set(seen).size, 125);
  assert.ok(!seen.includes(id(999)) && !seen.includes(id(1000)));
  assert.deepEqual(
    [...seen].sort(),
    Array.from({ length: 125 }, (_, i) => id(i)),
  );
});
test("queue API failure is distinct from an empty page and hides database details", async () => {
  await assert.rejects(loadReportingQueue(fixture(true).client, "a", null), {
    message: "Reporting records could not be loaded.",
  });
  const f = fixture();
  f.rows.length = 0;
  const result = await loadReportingQueue(f.client, "a", null);
  assert.deepEqual(result.records, []);
  assert.equal(result.next, null);
});

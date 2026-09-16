import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSchoolEnrollment } from "../../src/lib/school-enrollment.ts";
const id = "00000000-0000-4000-8000-000000000001";
function fixture(failure = "", status = "active") {
  let calls = 0;
  const enrollment = {
    id,
    organization_id: "a",
    student_user_id: "learner-a",
    course_version_id: "v1",
    status,
  };
  const rows: Record<string, Record<string, string>[]> = {
    organizations: [
      { id: "a", slug: "alpha" },
      { id: "b", slug: "beta" },
    ],
    enrollments: [enrollment],
  };
  const client = {
    from(table: string) {
      calls++;
      let selected = rows[table];
      return {
        select() {
          return this;
        },
        eq(key: string, value: string) {
          selected = selected.filter((r) => r[key] === value);
          return this;
        },
        async single() {
          if (failure === "throw") throw Error("PRIVATE DETAIL");
          return {
            data: selected[0] ?? null,
            error: failure === table ? "PRIVATE DETAIL" : null,
          };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { client, enrollment, calls: () => calls };
}
test("enrollment must belong to both requested school and authenticated learner", async () => {
  const f = fixture();
  assert.equal(
    await loadSchoolEnrollment(f.client, "beta", id, "learner-a"),
    null,
  );
  assert.equal(
    await loadSchoolEnrollment(f.client, "alpha", id, "learner-b"),
    null,
  );
  assert.equal(
    await loadSchoolEnrollment(f.client, "missing", id, "learner-a"),
    null,
  );
  assert.deepEqual(
    await loadSchoolEnrollment(f.client, "alpha", id, "learner-a"),
    f.enrollment,
  );
});
test("invalid context and database failures fail closed without private details", async () => {
  const f = fixture();
  for (const [slug, enrollment] of [
    ["alpha", "bad"],
    ["../beta", id],
    [null, id],
    ["alpha", null],
  ])
    assert.equal(
      await loadSchoolEnrollment(f.client, slug, enrollment, "learner-a"),
      null,
    );
  assert.equal(f.calls(), 0);
  for (const failure of ["organizations", "enrollments", "throw"])
    assert.equal(
      await loadSchoolEnrollment(
        fixture(failure).client,
        "alpha",
        id,
        "learner-a",
      ),
      null,
    );
});
test("completed enrollments remain available for historical results and permitted retakes", async () => {
  const f = fixture("", "completed");
  assert.deepEqual(
    await loadSchoolEnrollment(f.client, "alpha", id, "learner-a"),
    f.enrollment,
  );
});

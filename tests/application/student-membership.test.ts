import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadStudentMembership } from "../../src/lib/student-membership.ts";

const userId = "494e812b-757d-49bd-9195-30053f3f7bbb";
function fixture(error = false) {
  let queries = 0;
  const client = {
    from(table: string) {
      queries++;
      assert.equal(table, "organization_memberships");
      let rows: Record<string, string>[] = [
        {
          user_id: userId,
          organization_id: "school-a",
          role: "student",
          status: "active",
        },
      ];
      return {
        select() {
          return this;
        },
        eq(field: string, value: string) {
          rows = rows.filter((row) => row[field] === value);
          return this;
        },
        async maybeSingle() {
          return {
            data: rows[0] ?? null,
            error: error ? { message: "private database details" } : null,
          };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { client, count: () => queries };
}

test("malformed IDs stop before database access", async () => {
  const f = fixture();
  assert.equal(
    await loadStudentMembership(f.client, "school-a", "not-a-uuid"),
    null,
  );
  assert.equal(f.count(), 0);
});

test("missing and other-school students return no membership", async () => {
  const f = fixture();
  assert.equal(await loadStudentMembership(f.client, "school-b", userId), null);
  assert.equal(
    await loadStudentMembership(
      f.client,
      "school-a",
      "00000000-0000-4000-8000-000000000000",
    ),
    null,
  );
});

test("existing student loads while database failures stay distinct from missing records", async () => {
  assert.equal(
    (await loadStudentMembership(fixture().client, "school-a", userId))?.status,
    "active",
  );
  await assert.rejects(
    loadStudentMembership(fixture(true).client, "school-a", userId),
    {
      message: "Student membership could not be loaded.",
    },
  );
});

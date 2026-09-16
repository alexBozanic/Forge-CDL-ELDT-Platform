import assert from "node:assert/strict";
import test from "node:test";
import { submitProfile } from "../../src/lib/student-profile.ts";
import { recordTime } from "../../src/lib/record-time.ts";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    organizationId: "aaaaaaaa-0000-4000-8000-000000000001",
    userId: "10000000-0000-4000-8000-000000000002",
    slug: "forge-demo",
    firstName: " Demo ",
    lastName: "Student",
    middleName: "Preserve test",
    birthDate: "1990-01-01",
    jurisdiction: "co",
    permitNumber: "DEMO-ONLY",
    ...overrides,
  }))
    data.set(key, value);
  return data;
}
test("invalid profile fields are rejected before RPC and entries are preserved", async () => {
  for (const [field, value] of [
    ["firstName", "   "],
    ["lastName", ""],
    ["middleName", "x".repeat(101)],
    ["birthDate", "2026-09-14"],
    ["birthDate", "2026-02-30"],
    ["birthDate", "not-a-date"],
    ["permitNumber", "x".repeat(65)],
    ["jurisdiction", "Colorado"],
  ]) {
    const data = form({ [field]: value });
    const result = await submitProfile(
      data,
      () => {
        throw new Error("RPC must not run");
      },
      "2026-09-14",
    );
    assert.ok(result.fieldErrors?.[field as keyof typeof result.fieldErrors]);
    assert.equal(result.values?.[field as keyof typeof result.values], value);
    assert.equal(result.saved, undefined);
  }
});
test("invalid context never invokes a mutation", async () => {
  let calls = 0;
  for (const key of ["organizationId", "userId", "slug"]) {
    const result = await submitProfile(form({ [key]: "" }), async () => {
      calls++;
      return { error: null };
    });
    assert.match(result.error!, /could not be identified/);
  }
  assert.equal(calls, 0);
});
test("RPC and transport failures retain values, sanitize errors, and never retry", async () => {
  for (const kind of ["rpc", "transport", "permission"]) {
    let calls = 0;
    const result = await submitProfile(form(), async () => {
      calls++;
      if (kind === "transport") throw new Error("private schema secret");
      return {
        error: {
          code: kind === "permission" ? "42501" : "23503",
          message: "private schema secret",
        },
      };
    });
    assert.equal(calls, 1);
    assert.equal(result.values?.middleName, "Preserve test");
    assert.equal(result.values?.firstName, " Demo ");
    assert.doesNotMatch(result.error!, /private|schema|secret|23503|42501/);
    assert.equal(result.saved, undefined);
  }
});
test("successful save normalizes payload and allows absent optional fields", async () => {
  let calls = 0;
  const result = await submitProfile(
    form({ birthDate: "", permitNumber: "", middleName: "" }),
    async (payload) => {
      calls++;
      assert.equal(payload.first_name, "Demo");
      assert.equal(payload.jurisdiction, "CO");
      assert.equal(payload.birth_date, null);
      assert.equal(payload.middle_name, null);
      assert.equal(payload.permit_number, null);
      return { error: null };
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.saved, true);
});
test("record timestamps state UTC and preserve the instant across offsets", () => {
  assert.equal(
    recordTime("2026-09-14T12:16:34-06:00"),
    "2026-09-14 18:16:34 UTC",
  );
  assert.equal(recordTime(null), "Not recorded");
  assert.equal(recordTime("invalid"), "Not recorded");
});

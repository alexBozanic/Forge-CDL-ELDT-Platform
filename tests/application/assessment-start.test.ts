import assert from "node:assert/strict";
import test from "node:test";
import { requestAssessmentStart } from "../../src/lib/assessment-start.ts";
const id = "00000000-0000-4000-8000-000000000001";
const key = "00000000-0000-4000-8000-000000000002";
function form() {
  const f = new FormData();
  f.set("enrollmentId", id);
  f.set("assessmentId", id);
  f.set("slug", "forge-demo");
  return f;
}
test("invalid start context makes no RPC call", async () => {
  for (const name of ["enrollmentId", "assessmentId", "slug"]) {
    const f = form();
    f.set(name, "../invalid");
    assert.match(
      (
        await requestAssessmentStart(f, key, async () => {
          assert.fail("No RPC expected");
        })
      ).error!,
      /Reopen/,
    );
  }
});
test("start failures are sanitized and never automatically retried", async () => {
  for (const code of ["55000", "42501", "XX000", "throw"]) {
    let calls = 0;
    const result = await requestAssessmentStart(form(), key, async () => {
      calls++;
      if (code === "throw") throw new Error("private SQL detail");
      return { data: null, error: { code, message: "private SQL detail" } };
    });
    assert.equal(calls, 1);
    assert.ok(result.error);
    assert.equal(result.attemptId, undefined);
    assert.doesNotMatch(result.error!, /private|SQL|XX000/);
  }
});
test("manual resubmission of one rendered form keeps its request key", async () => {
  const keys: string[] = [];
  for (let i = 0; i < 2; i++) {
    const result = await requestAssessmentStart(
      form(),
      key,
      async (payload) => {
        keys.push(payload.request_idempotency_key);
        return { data: { attempt_id: id }, error: null };
      },
    );
    assert.equal(result.attemptId, id);
  }
  assert.deepEqual(keys, [key, key]);
});
test("missing or malformed returned attempt ID is not accepted as success", async () => {
  for (const data of [null, {}, { attempt_id: "../../unexpected" }])
    assert.match(
      (
        await requestAssessmentStart(form(), key, async () => ({
          data,
          error: null,
        }))
      ).error!,
      /could not confirm/,
    );
});

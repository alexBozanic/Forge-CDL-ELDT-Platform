import assert from "node:assert/strict";
import test from "node:test";
import { saveCourseLifecycle } from "../../src/lib/course-lifecycle.ts";
const id = "00000000-0000-4000-8000-000000000001",
  hash = "a".repeat(64);
function form() {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    versionId: id,
    manifestHash: hash,
    decision: "approved",
    notes: " Fake review ",
    reason: " Fake retirement ",
  }))
    f.set(k, v);
  return f;
}
test("lifecycle actions reject missing displayed hash, invalid decisions and absent reasons", async () => {
  for (const [field, value] of [
    ["versionId", "bad"],
    ["manifestHash", ""],
    ["manifestHash", "wrong"],
    ["decision", "unknown"],
    ["notes", ""],
  ]) {
    const f = form();
    f.set(field, value);
    assert.ok(
      (
        await saveCourseLifecycle("review", f, async () => {
          assert.fail("No RPC expected");
        })
      ).error,
    );
  }
  const f = form();
  f.set("reason", "");
  assert.ok(
    (
      await saveCourseLifecycle("retire", f, async () => {
        assert.fail("No RPC expected");
      })
    ).error,
  );
});
test("review and publication forward the displayed hash and never call legacy bypasses", async () => {
  assert.ok(
    (
      await saveCourseLifecycle("review", form(), async (name, payload) => {
        assert.equal(name, "review_course_version_at_hash");
        assert.deepEqual(payload, {
          target_version_id: id,
          expected_manifest_hash: hash,
          review_decision: "approved",
          review_notes: "Fake review",
        });
        return { error: null };
      })
    ).success,
  );
  assert.ok(
    (
      await saveCourseLifecycle("publish", form(), async (name, payload) => {
        assert.equal(name, "publish_course_version_at_hash");
        assert.deepEqual(payload, {
          target_version_id: id,
          expected_manifest_hash: hash,
        });
        return { error: null };
      })
    ).success,
  );
  assert.ok(
    (
      await saveCourseLifecycle("retire", form(), async (name, payload) => {
        assert.equal(name, "retire_course_version");
        assert.deepEqual(payload, {
          target_version_id: id,
          reason: "Fake retirement",
        });
        return { error: null };
      })
    ).success,
  );
});
test("stale hashes and unavailable safeguards fail closed without retry or fallback", async () => {
  for (const code of [
    "40001",
    "42883",
    "PGRST202",
    "55000",
    "42501",
    "throw",
  ]) {
    let calls = 0;
    const result = await saveCourseLifecycle("review", form(), async () => {
      calls++;
      if (code === "throw") throw new Error("PRIVATE DETAIL");
      return { error: { code, message: "PRIVATE DETAIL" } };
    });
    assert.equal(calls, 1);
    assert.equal(result.success, undefined);
    assert.ok(result.error);
    assert.doesNotMatch(result.error!, /PRIVATE|42501/);
    if (code === "40001") assert.match(result.error!, /draft changed/);
    if (code === "PGRST202")
      assert.match(result.error!, /temporarily unavailable/);
  }
});

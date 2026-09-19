import assert from "node:assert/strict";
import test from "node:test";
import {
  saveLessonInteraction,
  type LessonInteractionRequest,
} from "../../src/lib/lesson-interaction.ts";
const id = "00000000-0000-4000-8000-000000000001";
const payload: LessonInteractionRequest = {
  target_enrollment_id: id,
  target_lesson_id: id,
  target_interaction_type: "position_saved",
  target_resume_position: 2,
  request_idempotency_key: id,
};

test("invalid lesson context and positions never invoke RPC", async () => {
  for (const change of [
    { target_enrollment_id: "bad" },
    { target_lesson_id: "bad" },
    { request_idempotency_key: "bad" },
    { target_resume_position: -1 },
    { target_resume_position: 0.5 },
    { target_resume_position: NaN },
    { target_resume_position: 2147483648 },
    { target_interaction_type: "unknown" },
  ]) {
    const result = await saveLessonInteraction(
      { ...payload, ...change } as LessonInteractionRequest,
      async () => {
        assert.fail("No RPC expected");
      },
    );
    assert.ok(result.error);
    assert.equal(result.saved, undefined);
  }
});
test("RPC and transport failures are sanitized without retry", async () => {
  for (const code of ["42501", "XX000", "throw"]) {
    let calls = 0;
    const result = await saveLessonInteraction(payload, async () => {
      calls++;
      if (code === "throw") throw new Error("PRIVATE SQL DETAIL");
      return { error: { code, message: "PRIVATE SQL DETAIL" } };
    });
    assert.equal(calls, 1);
    assert.ok(result.error);
    assert.doesNotMatch(result.error!, /PRIVATE|SQL|XX000/);
    assert.equal(result.saved, undefined);
  }
});
test("all supported interactions forward exact payloads and request keys", async () => {
  for (const type of ["opened", "position_saved", "completed"] as const) {
    const expected = { ...payload, target_interaction_type: type };
    const result = await saveLessonInteraction(expected, async (actual) => {
      assert.deepEqual(actual, expected);
      return { error: null };
    });
    assert.deepEqual(result, { saved: true });
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { saveDraftSettings } from "../../src/lib/draft-settings.ts";
const id = "00000000-0000-4000-8000-000000000001";
function form() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    versionId: id,
    lessonId: id,
    title: " Demo ",
    description: " Description ",
    kind: "final_exam",
    position: "1",
    questionCount: "10",
    passingPercent: "80",
    timeLimit: "5",
  }))
    form.set(key, value);
  return form;
}
test("assessment setup rejects missing quiz lesson and invalid exam thresholds before RPC", async () => {
  const invalid = [
    { kind: "bad" },
    { kind: "lesson_quiz", lessonId: "" },
    { passingPercent: "79" },
    { passingPercent: "101" },
    { questionCount: "0" },
    { position: "1.5" },
    { timeLimit: "241" },
    { timeLimit: "" },
    { versionId: "bad" },
    { title: "a".repeat(161) },
  ];
  for (const changes of invalid) {
    const f = form();
    for (const [key, value] of Object.entries(changes)) f.set(key, value);
    assert.ok(
      (
        await saveDraftSettings("assessment", f, async () => {
          assert.fail("No RPC expected");
        })
      ).error,
    );
  }
});
test("quiz, final and metadata payloads preserve database-enforced distinctions", async () => {
  for (const kind of ["lesson_quiz", "final_exam"]) {
    const f = form();
    f.set("kind", kind);
    if (kind === "lesson_quiz") f.set("passingPercent", "1");
    const result = await saveDraftSettings(
      "assessment",
      f,
      async (name, payload) => {
        assert.equal(name, "add_assessment");
        assert.deepEqual(payload, {
          target_version_id: id,
          target_lesson_id: kind === "lesson_quiz" ? id : null,
          assessment_kind: kind,
          assessment_title: "Demo",
          assessment_position: 1,
          assessment_question_count: 10,
          assessment_passing_percent: kind === "lesson_quiz" ? 1 : 80,
          assessment_time_limit_minutes: 5,
        });
        return { error: null };
      },
    );
    assert.ok(result.success);
  }
  const result = await saveDraftSettings(
    "metadata",
    form(),
    async (name, payload) => {
      assert.equal(name, "update_course_version_draft");
      assert.deepEqual(payload, {
        target_version_id: id,
        version_title: "Demo",
        version_description: "Description",
      });
      return { error: null };
    },
  );
  assert.ok(result.success);
});
test("settings failures preserve inputs and sanitize failures without retry", async () => {
  const missing = form();
  missing.set("description", " ");
  assert.ok(
    (
      await saveDraftSettings("metadata", missing, async () => {
        assert.fail("No RPC expected");
      })
    ).error,
  );
  for (const thrown of [false, true]) {
    const f = form(),
      original = Array.from(f.entries());
    let calls = 0;
    const result = await saveDraftSettings("assessment", f, async () => {
      calls++;
      if (thrown) throw new Error("PRIVATE DETAIL");
      return { error: { message: "PRIVATE DETAIL" } };
    });
    assert.equal(calls, 1);
    assert.equal(result.success, undefined);
    assert.match(result.error!, /Check the draft/);
    assert.doesNotMatch(result.error!, /PRIVATE/);
    assert.deepEqual(Array.from(f.entries()), original);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  editDraftContent,
  type DraftContentOperation,
} from "../../src/lib/draft-content.ts";
const id = "00000000-0000-4000-8000-000000000001";
function form() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    versionId: id,
    moduleId: id,
    lessonId: id,
    title: " Demo title ",
    position: "2",
    minutes: "10",
    body: " # Demo body ",
  }))
    form.set(key, value);
  return form;
}
test("draft edits validate IDs, required text, positions and minute bounds before RPC", async () => {
  for (const [field, value] of [
    ["versionId", "bad"],
    ["moduleId", "bad"],
    ["title", " "],
    ["position", "0"],
    ["position", "1.5"],
    ["position", "2147483648"],
    ["minutes", "241"],
    ["minutes", ""],
    ["body", " "],
  ]) {
    const f = form();
    f.set(field, value);
    assert.ok(
      (
        await editDraftContent("addLesson", f, async () => {
          assert.fail("No RPC expected");
        })
      ).error,
    );
  }
  const f = form();
  f.set("lessonId", "bad");
  assert.ok(
    (
      await editDraftContent("saveLesson", f, async () => {
        assert.fail("No RPC expected");
      })
    ).error,
  );
});
test("each draft operation forwards only its intended identifiers and normalized fields", async () => {
  const expected = {
    addModule: [
      "add_course_module",
      { target_version_id: id, module_title: "Demo title", module_position: 2 },
    ],
    saveModule: [
      "update_course_module",
      { target_module_id: id, module_title: "Demo title", module_position: 2 },
    ],
    addLesson: [
      "add_course_lesson",
      {
        target_version_id: id,
        target_module_id: id,
        lesson_title: "Demo title",
        lesson_body_markdown: "# Demo body",
        lesson_position: 2,
        lesson_estimated_minutes: 10,
      },
    ],
    saveLesson: [
      "update_course_lesson",
      {
        target_lesson_id: id,
        lesson_title: "Demo title",
        lesson_body_markdown: "# Demo body",
        lesson_position: 2,
        lesson_estimated_minutes: 10,
      },
    ],
  };
  for (const operation of Object.keys(expected) as DraftContentOperation[]) {
    const result = await editDraftContent(
      operation,
      form(),
      async (name, payload) => {
        assert.deepEqual([name, payload], expected[operation]);
        return { error: null };
      },
    );
    assert.ok(result.success);
    assert.equal(result.error, undefined);
  }
});
test("database and transport failures produce safe uncertainty feedback without retry or input mutation", async () => {
  for (const throws of [false, true]) {
    const f = form(),
      original = Array.from(f.entries());
    let calls = 0;
    const result = await editDraftContent("addModule", f, async () => {
      calls++;
      if (throws) throw new Error("PRIVATE DATABASE DETAIL");
      return { error: { message: "PRIVATE DATABASE DETAIL" } };
    });
    assert.equal(calls, 1);
    assert.match(result.error!, /Check the draft/);
    assert.doesNotMatch(result.error!, /PRIVATE|DATABASE/);
    assert.equal(result.success, undefined);
    assert.deepEqual(Array.from(f.entries()), original);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  createCourseDraft,
  createSchoolRecord,
} from "../../src/lib/platform-creation.ts";
const id = "00000000-0000-4000-8000-000000000001",
  versionId = "00000000-0000-4000-8000-000000000002";
function form() {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    courseId: id,
    title: " Fake course ",
    description: " Fake description ",
    isDemo: "on",
    name: " Fake school ",
    slug: "fake-school",
    email: "",
  }))
    f.set(k, v);
  return f;
}
test("platform creation validates inputs before calling RPC", async () => {
  const f = form();
  f.set("title", "");
  assert.ok(
    (
      await createCourseDraft("course", f, async () => {
        assert.fail("No RPC expected");
      })
    ).error,
  );
  f.set("courseId", "bad");
  assert.ok(
    (
      await createCourseDraft("revision", f, async () => {
        assert.fail("No RPC expected");
      })
    ).error,
  );
  for (const [field, value] of [
    ["name", ""],
    ["slug", "../bad"],
    ["email", "bad"],
  ]) {
    const invalid = form();
    invalid.set(field, value);
    assert.ok(
      (
        await createSchoolRecord(invalid, async () => {
          assert.fail("No RPC expected");
        })
      ).error,
    );
  }
});
test("course and revision creation use verified returned IDs and exact payloads", async () => {
  const seen: unknown[] = [];
  const result = await createCourseDraft(
    "course",
    form(),
    async (name, payload) => {
      seen.push([name, payload]);
      return { data: name === "create_course" ? id : versionId, error: null };
    },
  );
  assert.deepEqual(seen, [
    [
      "create_course",
      {
        course_title: "Fake course",
        course_description: "Fake description",
        demo_content: true,
      },
    ],
    ["create_course_version", { target_course_id: id }],
  ]);
  assert.equal(result.versionId, versionId);
  assert.equal(result.courseCreated, true);
  const revision = await createCourseDraft(
    "revision",
    form(),
    async (name, payload) => {
      assert.equal(name, "create_course_version");
      assert.deepEqual(payload, { target_course_id: id });
      return { data: versionId, error: null };
    },
  );
  assert.equal(revision.versionId, versionId);
});
test("partial creation failure never recreates the course and explains recovery", async () => {
  for (const thrown of [false, true]) {
    const calls: string[] = [];
    const result = await createCourseDraft("course", form(), async (name) => {
      calls.push(name);
      if (name === "create_course") return { data: id, error: null };
      if (thrown) throw new Error("PRIVATE DETAIL");
      return { data: null, error: { message: "PRIVATE DETAIL" } };
    });
    assert.deepEqual(calls, ["create_course", "create_course_version"]);
    assert.equal(result.courseCreated, true);
    assert.equal(result.versionId, undefined);
    assert.match(result.error!, /Do not create the course again/);
    assert.doesNotMatch(result.error!, /PRIVATE/);
  }
  let calls = 0;
  const result = await createCourseDraft("course", form(), async () => {
    calls++;
    return { data: "../../bad", error: null };
  });
  assert.equal(calls, 1);
  assert.equal(result.versionId, undefined);
  assert.ok(result.error);
});
test("school creation normalizes payloads and sanitizes failures without retry", async () => {
  assert.ok(
    (
      await createSchoolRecord(form(), async (name, payload) => {
        assert.equal(name, "create_organization");
        assert.deepEqual(payload, {
          organization_name: "Fake school",
          organization_slug: "fake-school",
          organization_email: null,
        });
        return { data: id, error: null };
      })
    ).success,
  );
  for (const thrown of [false, true]) {
    let calls = 0;
    const result = await createSchoolRecord(form(), async () => {
      calls++;
      if (thrown) throw new Error("PRIVATE DETAIL");
      return { data: null, error: { message: "PRIVATE DETAIL" } };
    });
    assert.equal(calls, 1);
    assert.ok(result.error);
    assert.doesNotMatch(result.error!, /PRIVATE/);
    assert.equal(result.success, undefined);
  }
});

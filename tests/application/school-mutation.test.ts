import assert from "node:assert/strict";
import test from "node:test";
import {
  saveSchoolMutation,
  type SchoolMutation,
} from "../../src/lib/school-mutation.ts";
const id = "00000000-0000-4000-8000-000000000001";
function form() {
  const f = new FormData();
  for (const [key, value] of Object.entries({
    slug: "forge-demo",
    organizationId: id,
    invitationId: id,
    courseVersionId: id,
    assignmentId: id,
    userId: id,
    name: " Demo school ",
    email: "",
    primaryColor: "#112233",
    accentColor: "#445566",
    title: " Demo assignment ",
    reason: " Fake reason ",
  }))
    f.set(key, value);
  return f;
}
test("school actions reject invalid identifiers and fields before RPC", async () => {
  for (const [operation, field, value] of [
    ["settings", "slug", "../bad"],
    ["settings", "organizationId", "bad"],
    ["settings", "name", " "],
    ["settings", "email", "bad"],
    ["settings", "primaryColor", "red"],
    ["revokeInvitation", "invitationId", "bad"],
    ["createAssignment", "courseVersionId", "bad"],
    ["createAssignment", "title", ""],
    ["withdrawAssignment", "reason", ""],
    ["withdrawAssignment", "assignmentId", "bad"],
    ["enrollStudent", "userId", "bad"],
    ["enrollStudent", "assignmentId", "bad"],
  ]) {
    const f = form();
    f.set(field, value);
    assert.ok(
      (
        await saveSchoolMutation(operation as SchoolMutation, f, async () => {
          assert.fail("No RPC expected");
        })
      ).error,
    );
  }
});
test("school operations forward exact RPC targets without changing authorization context", async () => {
  const expected = {
    settings: [
      "update_organization_settings",
      {
        target_organization_id: id,
        organization_name: "Demo school",
        organization_email: "",
        primary_color: "#112233",
        accent_color: "#445566",
      },
    ],
    revokeInvitation: ["revoke_invitation", { target_invitation_id: id }],
    createAssignment: [
      "create_course_assignment",
      {
        target_organization_id: id,
        target_course_version_id: id,
        assignment_title: "Demo assignment",
      },
    ],
    withdrawAssignment: [
      "withdraw_course_assignment",
      { target_assignment_id: id, reason: "Fake reason" },
    ],
    enrollStudent: [
      "create_student_enrollment",
      {
        target_organization_id: id,
        target_student_user_id: id,
        target_assignment_id: id,
      },
    ],
  };
  for (const operation of Object.keys(expected) as SchoolMutation[]) {
    assert.ok(
      (
        await saveSchoolMutation(operation, form(), async (name, payload) => {
          assert.deepEqual([name, payload], expected[operation]);
          return { error: null };
        })
      ).success,
    );
  }
});
test("school RPC and transport errors are sanitized and never automatically retried", async () => {
  for (const thrown of [false, true]) {
    const f = form(),
      before = Array.from(f.entries());
    let calls = 0;
    const result = await saveSchoolMutation("createAssignment", f, async () => {
      calls++;
      if (thrown) throw new Error("PRIVATE AUTH DETAIL");
      return { error: { code: "42501", message: "PRIVATE AUTH DETAIL" } };
    });
    assert.equal(calls, 1);
    assert.ok(result.error);
    assert.doesNotMatch(result.error!, /PRIVATE|AUTH|42501/);
    assert.equal(result.success, undefined);
    assert.deepEqual(Array.from(f.entries()), before);
  }
});

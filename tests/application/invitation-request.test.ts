import assert from "node:assert/strict";
import test from "node:test";
import {
  invitationFailure,
  requestInvitation,
} from "../../src/lib/invitation-request.ts";
const id = "00000000-0000-4000-8000-000000000001";
function form() {
  const f = new FormData();
  for (const [key, value] of Object.entries({
    organizationId: id,
    email: " Fake@Example.invalid ",
    assignmentId: "",
    slug: "fake-school",
  }))
    f.set(key, value);
  return f;
}
test("invalid invitation fields never reach secret generation or RPC", async () => {
  for (const [field, value] of [
    ["organizationId", "bad"],
    ["email", ""],
    ["email", "bad"],
    ["assignmentId", "bad"],
    ["slug", "../bad"],
  ]) {
    const f = form();
    f.set(field, value);
    let calls = 0;
    const result = await requestInvitation("student", f, async () => {
      calls++;
      return { token: "fake-secret" };
    });
    assert.equal(calls, 0);
    assert.ok(result.error);
    assert.equal(result.token, undefined);
  }
});
test("invitations normalize email and preserve the authorized assignment input", async () => {
  for (const kind of ["student", "administrator"] as const) {
    const f = form();
    f.set("assignmentId", id);
    const result = await requestInvitation(kind, f, async (values) => {
      assert.deepEqual(values, {
        organizationId: id,
        email: "fake@example.invalid",
        assignmentId: kind === "student" ? id : null,
      });
      return { token: "fake-secret" };
    });
    assert.deepEqual(result, { token: "fake-secret" });
    assert.equal(f.get("email"), " Fake@Example.invalid ");
  }
});
test("uncertain invitation failures sanitize details, withhold tokens and never retry", async () => {
  for (const mode of ["throw", "error", "empty"]) {
    let calls = 0;
    const result = await requestInvitation("student", form(), async () => {
      calls++;
      if (mode === "throw") throw new Error("PRIVATE DETAIL");
      return mode === "error"
        ? { error: "PRIVATE DETAIL", token: "fake-secret" }
        : {};
    });
    assert.equal(calls, 1);
    assert.deepEqual(result, { error: invitationFailure });
  }
});

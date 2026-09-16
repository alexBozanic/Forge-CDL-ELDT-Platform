import assert from "node:assert/strict";
import test from "node:test";
import {
  runAuthAction,
  redeemInvitation,
  type AuthOperation,
} from "../../src/lib/auth-action.ts";
function form() {
  const f = new FormData();
  f.set("email", " Fake@Example.invalid ");
  f.set("password", "  synthetic phrase  ");
  f.set("token", " synthetic-token ");
  return f;
}
test("auth validates required inputs before calling providers", async () => {
  for (const [operation, field, value] of [
    ["login", "password", ""],
    ["login", "email", "bad"],
    ["signup", "password", "short"],
    ["update", "password", "short"],
    ["recover", "email", ""],
  ] as const) {
    const f = form();
    f.set(field, value);
    let calls = 0;
    const state = await runAuthAction(operation, f, async () => {
      calls++;
      return { error: null };
    });
    assert.equal(calls, 0);
    assert.ok(state.error);
    assert.equal(state.complete, undefined);
  }
});
test("auth callbacks receive normalized email and exact password without echoing credentials", async () => {
  for (const operation of ["login", "signup", "update"] as const) {
    const state = await runAuthAction(operation, form(), async (values) => {
      assert.deepEqual(values, {
        email: "fake@example.invalid",
        password: "  synthetic phrase  ",
      });
      return { error: null };
    });
    assert.deepEqual(state, { complete: true });
  }
});
test("signup and recovery outcomes remain indistinguishable for provider rejection and transport failure", async () => {
  for (const operation of ["signup", "recover"] as const) {
    for (const mode of ["success", "rejection", "throw"]) {
      let calls = 0;
      const state = await runAuthAction(operation, form(), async () => {
        calls++;
        if (mode === "throw") throw new Error("PRIVATE ACCOUNT DETAIL");
        return {
          error: mode === "rejection" ? "PRIVATE ACCOUNT DETAIL" : null,
        };
      });
      assert.equal(calls, 1);
      assert.deepEqual(state, { complete: true });
    }
  }
});
test("login, update and logout failures never claim completion or retry", async () => {
  for (const operation of [
    "login",
    "update",
    "logout",
  ] satisfies AuthOperation[]) {
    for (const thrown of [false, true]) {
      let calls = 0;
      const state = await runAuthAction(operation, form(), async () => {
        calls++;
        if (thrown) throw new Error("PRIVATE DETAIL");
        return { error: "PRIVATE DETAIL" };
      });
      assert.equal(calls, 1);
      assert.equal(state.complete, undefined);
      assert.ok(state.error);
      assert.doesNotMatch(state.error, /PRIVATE|synthetic/);
      if (operation === "logout") assert.match(state.error, /Do not assume/);
    }
  }
});
test("invitation acceptance validates, withholds secret state and handles uncertain failure without retry", async () => {
  const missing = form();
  missing.delete("token");
  let calls = 0;
  assert.ok(
    (
      await redeemInvitation(missing, async () => {
        calls++;
        return { data: true, error: null };
      })
    ).error,
  );
  assert.equal(calls, 0);
  assert.deepEqual(
    await redeemInvitation(form(), async (token) => {
      assert.equal(token, "synthetic-token");
      return { data: true, error: null };
    }),
    { complete: true },
  );
  for (const mode of ["empty", "rejection", "throw"]) {
    calls = 0;
    const state = await redeemInvitation(form(), async () => {
      calls++;
      if (mode === "throw") throw new Error("PRIVATE DETAIL");
      return {
        data: mode === "empty" ? null : true,
        error: mode === "rejection" ? "PRIVATE DETAIL" : null,
      };
    });
    assert.equal(calls, 1);
    assert.equal(state.complete, undefined);
    assert.match(state.error!, /dashboard/);
    assert.doesNotMatch(state.error!, /PRIVATE|synthetic-token/);
  }
});

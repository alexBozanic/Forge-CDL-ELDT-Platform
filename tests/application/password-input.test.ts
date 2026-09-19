import assert from "node:assert/strict";
import test from "node:test";
import { readPassword } from "../../src/lib/password-input.ts";

test("password extraction preserves boundary spaces and Unicode exactly", () => {
  for (const value of [
    "  fake fixture phrase  ",
    "\tfake fixture\n",
    " e\u0301 fixture \u00e9 ",
    "            ",
  ]) {
    const form = new FormData();
    form.set("password", value);
    assert.equal(readPassword(form), value);
  }
});
test("missing, empty and file password fields fail closed", () => {
  const form = new FormData();
  assert.equal(readPassword(form), null);
  form.set("password", "");
  assert.equal(readPassword(form), null);
  form.set("password", new Blob(["fake fixture"]), "fixture.txt");
  assert.equal(readPassword(form), null);
});

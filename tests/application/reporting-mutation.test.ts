import assert from "node:assert/strict";
import test from "node:test";
import { saveReportingMutation } from "../../src/lib/reporting-mutation.ts";
const id = "00000000-0000-4000-8000-000000000001",
  key = "00000000-0000-4000-8000-000000000002";
function form() {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    slug: "forge-demo",
    organizationId: id,
    studentUserId: id,
    reportingId: id,
    dateOfBirth: "1990-01-01",
    licenseNumber: "FAKE-ONLY",
    jurisdiction: "xx",
    providerIdentifier: "FAKE-PROVIDER",
    status: "submitted",
    reason: " Synthetic evidence ",
  }))
    f.set(k, v);
  return f;
}
test("reporting identifier validation rejects invalid context and dates before RPC", async () => {
  for (const [field, value] of [
    ["slug", "../bad"],
    ["organizationId", "bad"],
    ["studentUserId", "bad"],
    ["dateOfBirth", "2026-02-30"],
    ["dateOfBirth", "2099-01-01"],
    ["licenseNumber", ""],
    ["jurisdiction", "xyz"],
    ["providerIdentifier", ""],
  ]) {
    const f = form();
    f.set(field, value);
    assert.ok(
      (
        await saveReportingMutation(
          "identifiers",
          f,
          null,
          async () => {
            assert.fail("No RPC expected");
          },
          "2026-09-16",
        )
      ).error,
    );
  }
});
test("reporting transitions reject invalid IDs, keys, states and absent evidence", async () => {
  for (const [field, value] of [
    ["reportingId", "bad"],
    ["status", "ready"],
    ["reason", " "],
  ]) {
    const f = form();
    f.set(field, value);
    assert.ok(
      (
        await saveReportingMutation("transition", f, key, async () => {
          assert.fail("No RPC expected");
        })
      ).error,
    );
  }
  assert.ok(
    (
      await saveReportingMutation("prepare", form(), "bad", async () => {
        assert.fail("No RPC expected");
      })
    ).error,
  );
});
test("reporting payloads keep stable rendered keys for manual repeats", async () => {
  const seen: string[] = [];
  for (let i = 0; i < 2; i++)
    assert.ok(
      (
        await saveReportingMutation(
          "transition",
          form(),
          key,
          async (name, payload) => {
            assert.equal(name, "transition_reporting");
            assert.deepEqual(payload, {
              target_reporting_record_id: id,
              request_idempotency_key: key,
              target_status: "submitted",
              transition_reason: "Synthetic evidence",
            });
            seen.push(String(payload.request_idempotency_key));
            return { error: null };
          },
        )
      ).success,
    );
  assert.deepEqual(seen, [key, key]);
  assert.ok(
    (
      await saveReportingMutation(
        "prepare",
        form(),
        key,
        async (name, payload) => {
          assert.equal(name, "prepare_reporting_record");
          assert.deepEqual(payload, {
            target_reporting_record_id: id,
            request_idempotency_key: key,
          });
          return { error: null };
        },
      )
    ).success,
  );
  assert.ok(
    (
      await saveReportingMutation(
        "identifiers",
        form(),
        null,
        async (name, payload) => {
          assert.equal(name, "update_reporting_identifiers");
          assert.deepEqual(payload, {
            target_organization_id: id,
            target_student_user_id: id,
            student_date_of_birth: "1990-01-01",
            student_license_or_permit_number: "FAKE-ONLY",
            student_issuing_jurisdiction: "XX",
            organization_provider_identifier: "FAKE-PROVIDER",
          });
          return { error: null };
        },
        "2026-09-16",
      )
    ).success,
  );
});
test("reporting failures preserve fields and sanitize errors without retry", async () => {
  for (const code of ["55000", "42501", "throw"]) {
    const f = form(),
      before = Array.from(f.entries());
    let calls = 0;
    const result = await saveReportingMutation(
      "transition",
      f,
      key,
      async () => {
        calls++;
        if (code === "throw") throw new Error("PRIVATE DETAIL");
        return { error: { code, message: "PRIVATE DETAIL" } };
      },
    );
    assert.equal(calls, 1);
    assert.ok(result.error);
    assert.doesNotMatch(result.error!, /PRIVATE|42501|55000/);
    assert.equal(result.success, undefined);
    assert.deepEqual(Array.from(f.entries()), before);
  }
});

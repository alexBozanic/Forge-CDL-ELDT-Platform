import assert from "node:assert/strict";
import test from "node:test";
import { submitAttempt } from "../../src/lib/assessment-submission.ts";

const attemptId = "00000000-0000-4000-8000-000000000001";
const enrollmentId = "00000000-0000-4000-8000-000000000002";
const questionId = "00000000-0000-4000-8000-000000000003";
const optionId = "00000000-0000-4000-8000-000000000004";
const attempt = {
  id: attemptId,
  enrollment_id: enrollmentId,
  status: "in_progress",
  questions: [
    {
      question_id: questionId,
      prompt: "Demonstration question",
      options: [{ option_id: optionId, text: "Demonstration option" }],
    },
  ],
};
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    attemptId,
    enrollmentId,
    slug: "forge-demo",
    [`question:${questionId}`]: optionId,
  }))
    data.set(key, value);
  return data;
}
const load = async () => ({ data: attempt, error: null });
const noSave = async () => {
  assert.fail("Mutation must not run");
};

test("invalid route context is rejected before any database call", async () => {
  for (const key of ["attemptId", "enrollmentId", "slug"]) {
    const data = form();
    data.set(key, "../invalid");
    assert.match((await submitAttempt(data, noSave, noSave)).error!, /Reopen/);
  }
});
test("unavailable or mismatched authenticated attempt never submits", async () => {
  for (const data of [
    null,
    { ...attempt, enrollment_id: attemptId },
    { ...attempt, id: enrollmentId },
  ])
    assert.match(
      (await submitAttempt(form(), async () => ({ data, error: null }), noSave))
        .error!,
      /unavailable/,
    );
});
test("missing, duplicate and foreign options get field feedback without mutation", async () => {
  for (const invalid of ["missing", "duplicate", "foreign"]) {
    const data = form();
    if (invalid === "missing") data.delete(`question:${questionId}`);
    if (invalid === "duplicate")
      data.append(`question:${questionId}`, optionId);
    if (invalid === "foreign") data.set(`question:${questionId}`, attemptId);
    const result = await submitAttempt(data, load, noSave);
    assert.match(result.fieldErrors?.[questionId] ?? "", /Choose one/);
  }
});
test("extra questions cannot be silently removed from a submission", async () => {
  const data = form();
  data.set(`question:${enrollmentId}`, optionId);
  assert.match(
    (await submitAttempt(data, load, noSave)).error!,
    /do not match/,
  );
});
test("returned and thrown RPC errors are sanitized without retry or false success", async () => {
  for (const throws of [false, true]) {
    let calls = 0;
    const data = form();
    const result = await submitAttempt(data, load, async () => {
      calls++;
      if (throws)
        throw new Error("private.assessment_answer_keys secret SQL detail");
      return {
        data: null,
        error: { message: "private.assessment_answer_keys secret SQL detail" },
      };
    });
    assert.equal(calls, 1);
    assert.equal(result.submitted, undefined);
    assert.match(result.error!, /No automatic retry/);
    assert.doesNotMatch(JSON.stringify(result), /private|secret|SQL/);
    assert.equal(data.get(`question:${questionId}`), optionId);
  }
});
test("read failures do not mutate and do not expose internal details", async () => {
  const result = await submitAttempt(
    form(),
    async () => ({ data: null, error: { message: "SQL private table" } }),
    noSave,
  );
  assert.match(result.error!, /could not confirm/);
  assert.doesNotMatch(result.error!, /SQL|private/);
});
test("complete answers are sent once; only database terminal results confirm submission", async () => {
  for (const status of ["passed", "failed", "expired", "in_progress"]) {
    let calls = 0;
    const result = await submitAttempt(form(), load, async (payload) => {
      calls++;
      assert.deepEqual(payload, {
        target_attempt_id: attemptId,
        submitted_answers: { [questionId]: optionId },
      });
      return { data: { status }, error: null };
    });
    assert.equal(calls, 1);
    assert.equal(result.submitted, status === "in_progress" ? undefined : true);
  }
});
test("a previously saved terminal attempt is displayed without another write", async () => {
  for (const status of ["passed", "failed", "expired"])
    assert.deepEqual(
      await submitAttempt(
        form(),
        async () => ({
          data: { ...attempt, status, questions: null },
          error: null,
        }),
        noSave,
      ),
      { submitted: true },
    );
});

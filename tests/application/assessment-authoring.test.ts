import assert from "node:assert/strict";
import test from "node:test";
import {
  safeAuthoringError,
  validateAssessmentQuestion,
  validateAssessmentTopic,
} from "../../src/lib/assessment-authoring.ts";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

test("topic validation rejects missing, punctuated, and non-positive values", () => {
  assert.throws(() => validateAssessmentTopic(form({})), /lowercase/);
  assert.throws(
    () =>
      validateAssessmentTopic(
        form({ topicCode: "demo-purpose", requiredCount: "1" }),
      ),
    /underscores/,
  );
  assert.throws(
    () =>
      validateAssessmentTopic(
        form({ topicCode: "demo_purpose", requiredCount: "0" }),
      ),
    /positive whole number/,
  );
});

test("question validation requires an existing topic and preserves valid input", () => {
  const data = form({
    topicCode: "not_in_blueprint",
    prompt: "Fake prompt",
    options: "No\nYes",
    correctOption: "1",
    rationale: "Fake review rationale",
  });
  assert.throws(
    () => validateAssessmentQuestion(data, ["demo_purpose"]),
    /existing blueprint topic/,
  );
  data.set("topicCode", "demo_purpose");
  const result = validateAssessmentQuestion(data, ["demo_purpose"]);
  assert.deepEqual(result.options, ["No", "Yes"]);
  assert.equal(result.values.prompt, "Fake prompt");
});

test("RPC failures map to a stable message without database details", () => {
  const message = safeAuthoringError();
  assert.match(message, /No automatic retry/);
  assert.doesNotMatch(message, /23503|foreign key|schema|relation/i);
});

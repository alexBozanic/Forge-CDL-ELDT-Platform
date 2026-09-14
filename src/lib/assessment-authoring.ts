export type AssessmentFormState = {
  error?: string;
  success?: string;
  values?: Record<string, string>;
};

const topicPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function positiveInteger(raw: string, label: string) {
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new Error(`${label} must be a positive whole number.`);
  return parsed;
}

export function validateAssessmentTopic(formData: FormData) {
  const values = {
    topicCode: value(formData, "topicCode"),
    requiredCount: value(formData, "requiredCount"),
  };
  if (!topicPattern.test(values.topicCode))
    throw new Error(
      "Topic code must use lowercase letters, numbers, and single underscores.",
    );
  return {
    values,
    topicCode: values.topicCode,
    requiredCount: positiveInteger(values.requiredCount, "Required count"),
  };
}

export function validateAssessmentQuestion(
  formData: FormData,
  allowedTopics: string[],
) {
  const values = {
    topicCode: value(formData, "topicCode"),
    prompt: value(formData, "prompt"),
    options: value(formData, "options"),
    correctOption: value(formData, "correctOption"),
    rationale: value(formData, "rationale"),
  };
  if (!allowedTopics.includes(values.topicCode))
    throw new Error("Choose an existing blueprint topic.");
  if (!values.prompt) throw new Error("Question prompt is required.");
  if (!values.rationale) throw new Error("Review rationale is required.");
  const options = values.options
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  if (options.length < 2) throw new Error("Enter at least two answer options.");
  const correctOption = positiveInteger(
    values.correctOption,
    "Correct option number",
  );
  if (correctOption > options.length)
    throw new Error("Correct option number must identify one of the options.");
  return { values, options, correctOption };
}

export function safeAuthoringError() {
  return "The change could not be saved. No automatic retry was attempted. Verify the draft state, then try again if it is safe.";
}

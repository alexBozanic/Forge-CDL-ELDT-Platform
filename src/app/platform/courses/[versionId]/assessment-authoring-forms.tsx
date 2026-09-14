"use client";

import { useActionState } from "react";
import { addAssessmentQuestion, addAssessmentTopic } from "../actions";
import type { AssessmentFormState } from "@/lib/assessment-authoring";

function Feedback({ state }: { state: AssessmentFormState }) {
  if (state.error)
    return (
      <p className="form-error" role="alert">
        {state.error}
      </p>
    );
  return state.success ? (
    <p className="form-success" role="status">
      {state.success}
    </p>
  ) : null;
}

export function AssessmentTopicForm({
  versionId,
  assessmentId,
}: {
  versionId: string;
  assessmentId: string;
}) {
  const [state, action, pending] = useActionState(addAssessmentTopic, {});
  return (
    <form action={action} className="form-stack compact-form">
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <label>
        Topic code
        <input
          name="topicCode"
          pattern="[a-z0-9]+(?:_[a-z0-9]+)*"
          placeholder="topic_code"
          defaultValue={state.values?.topicCode}
          aria-describedby={`topic-help-${assessmentId}`}
          required
        />
      </label>
      <small id={`topic-help-${assessmentId}`}>
        Lowercase letters and numbers separated by underscores.
      </small>
      <label>
        Questions selected from this topic
        <input
          name="requiredCount"
          type="number"
          min="1"
          step="1"
          defaultValue={state.values?.requiredCount}
          required
        />
      </label>
      <button className="text-button" disabled={pending}>
        {pending ? "Adding topic…" : "Add topic"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function AssessmentQuestionForm({
  versionId,
  assessmentId,
  topics,
}: {
  versionId: string;
  assessmentId: string;
  topics: string[];
}) {
  const [state, action, pending] = useActionState(addAssessmentQuestion, {});
  const disabled = pending || topics.length === 0;
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <label>
        Blueprint topic
        <select
          name="topicCode"
          defaultValue={state.values?.topicCode ?? ""}
          disabled={topics.length === 0}
          required
        >
          <option value="">Choose an existing topic</option>
          {topics.map((topic) => (
            <option value={topic} key={topic}>
              {topic}
            </option>
          ))}
        </select>
      </label>
      {topics.length === 0 ? (
        <p className="form-error" role="status">
          Add a blueprint topic before adding questions.
        </p>
      ) : null}
      <label>
        Prompt
        <textarea name="prompt" defaultValue={state.values?.prompt} required />
      </label>
      <label>
        Options, one per line
        <textarea
          name="options"
          rows={4}
          defaultValue={state.values?.options}
          required
        />
      </label>
      <label>
        Correct option number
        <input
          name="correctOption"
          type="number"
          min="1"
          step="1"
          defaultValue={state.values?.correctOption}
          required
        />
      </label>
      <label>
        Review rationale (not shown during final)
        <textarea
          name="rationale"
          defaultValue={state.values?.rationale}
          required
        />
      </label>
      <button className="button" disabled={disabled}>
        {pending ? "Adding question…" : "Add immutable-version question"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

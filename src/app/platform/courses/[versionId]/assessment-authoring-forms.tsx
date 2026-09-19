"use client";

import { useActionState, useEffect, useRef } from "react";
import { unstable_rethrow } from "next/navigation";
import { addAssessmentQuestion, addAssessmentTopic } from "../actions";
import {
  safeAuthoringError,
  type AssessmentFormState,
} from "@/lib/assessment-authoring";

function useAuthoringAction(
  action: (
    state: AssessmentFormState,
    form: FormData,
  ) => Promise<AssessmentFormState>,
) {
  return useActionState<AssessmentFormState, FormData>(
    async (previous, form) => {
      try {
        return await action(previous, form);
      } catch (error) {
        unstable_rethrow(error);
        return { error: safeAuthoringError() };
      }
    },
    {},
  );
}
function Feedback({ state }: { state: AssessmentFormState }) {
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);
  if (state.error)
    return (
      <p ref={errorRef} tabIndex={-1} className="form-error" role="alert">
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
  const [state, action, pending] = useAuthoringAction(addAssessmentTopic);
  return (
    <form
      action={action}
      className="form-stack compact-form"
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      <fieldset className="mutation-fields" disabled={pending}>
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
      </fieldset>
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
  const [state, action, pending] = useAuthoringAction(addAssessmentQuestion);
  const disabled = pending || topics.length === 0;
  return (
    <form
      action={action}
      className="form-stack"
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      <fieldset className="mutation-fields" disabled={disabled}>
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
          <textarea
            name="prompt"
            defaultValue={state.values?.prompt}
            required
          />
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
      </fieldset>
      <Feedback state={state} />
    </form>
  );
}

"use client";
import { unstable_rethrow } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  submissionFailure,
  type SubmissionState,
  type SelectedQuestion,
} from "@/lib/assessment-submission";
import { submitAssessment } from "./actions";

export function AttemptForm({
  slug,
  enrollmentId,
  attemptId,
  questions,
}: {
  slug: string;
  enrollmentId: string;
  attemptId: string;
  questions: SelectedQuestion[];
}) {
  const [state, action, pending] = useActionState<SubmissionState, FormData>(
    async (previous, form) => {
      try {
        return await submitAssessment(previous, form);
      } catch (error) {
        unstable_rethrow(error);
        return { error: submissionFailure };
      }
    },
    {},
  );
  // React's post-action native reset can clear radio DOM state even when the
  // controlled value has not changed. Cancel that reset below as well.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const errorSummary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error) errorSummary.current?.focus();
  }, [state]);
  const attemptPath = `/schools/${slug}/courses/${enrollmentId}/attempts/${attemptId}`;
  return (
    <form
      action={action}
      className="form-stack"
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="attemptId" value={attemptId} />
      {state.error ? (
        <div ref={errorSummary} tabIndex={-1} role="alert" className="notice">
          <p className="form-error">{state.error}</p>
          <a href={attemptPath} target="_blank" rel="noopener noreferrer">
            Check attempt status (opens in a new tab)
          </a>
          {Object.keys(state.fieldErrors ?? {}).length ? (
            <ul>
              {questions.map((q, i) =>
                state.fieldErrors?.[q.question_id] ? (
                  <li key={q.question_id}>
                    <a href={`#question-${q.question_id}`}>
                      Review question {i + 1}
                    </a>
                  </li>
                ) : null,
              )}
            </ul>
          ) : null}
        </div>
      ) : null}
      {questions.map((q, index) => (
        <fieldset
          className="panel"
          key={q.question_id}
          id={`question-${q.question_id}`}
          tabIndex={-1}
          aria-describedby={
            state.fieldErrors?.[q.question_id]
              ? `error-${q.question_id}`
              : undefined
          }
        >
          <legend>
            {index + 1}. {q.prompt}
          </legend>
          {q.options.map((option) => (
            <label className="answer-option" key={option.option_id}>
              <input
                type="radio"
                name={`question:${q.question_id}`}
                value={option.option_id}
                required
                checked={answers[q.question_id] === option.option_id}
                disabled={pending || state.submitted}
                onChange={() =>
                  setAnswers((current) => ({
                    ...current,
                    [q.question_id]: option.option_id,
                  }))
                }
                aria-describedby={
                  state.fieldErrors?.[q.question_id]
                    ? `error-${q.question_id}`
                    : undefined
                }
              />
              {option.text}
            </label>
          ))}
          {state.fieldErrors?.[q.question_id] ? (
            <p className="form-error" id={`error-${q.question_id}`}>
              {state.fieldErrors[q.question_id]}
            </p>
          ) : null}
        </fieldset>
      ))}
      <p role="status">
        {Object.keys(answers).length} of {questions.length} answered.
      </p>
      <button className="button" disabled={pending || state.submitted}>
        {pending
          ? "Submitting answers…"
          : state.submitted
            ? "Submission confirmed"
            : "Submit answers"}
      </button>
      {state.submitted ? (
        <p role="status">
          Your result is saved. <a href={attemptPath}>View attempt result</a>.
        </p>
      ) : null}
    </form>
  );
}

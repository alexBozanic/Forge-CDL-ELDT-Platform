"use client";
import { useActionState, useEffect, useRef } from "react";
import type { AssessmentStartState } from "@/lib/assessment-start";

export function StartForm({
  slug,
  enrollmentId,
  assessmentId,
  start,
}: {
  slug: string;
  enrollmentId: string;
  assessmentId: string;
  start: (
    state: AssessmentStartState,
    form: FormData,
  ) => Promise<AssessmentStartState>;
}) {
  const [state, action, pending] = useActionState(start, {});
  const error = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error) error.current?.focus();
  }, [state]);
  return (
    <form action={action} className="form-stack" aria-busy={pending}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="assessmentId" value={assessmentId} />
      {state.error ? (
        <p ref={error} tabIndex={-1} role="alert" className="form-error">
          {state.error}
        </p>
      ) : null}
      <button className="button" disabled={pending}>
        {pending ? "Starting assessment…" : "Start assessment"}
      </button>
      {state.error ? (
        <a href={`/schools/${slug}/courses/${enrollmentId}`}>
          Check course and existing attempts
        </a>
      ) : null}
    </form>
  );
}

"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import {
  draftContentFailure,
  type DraftContentState,
} from "@/lib/draft-content";

export function DraftContentForm({
  action,
  className,
  children,
}: {
  action: (form: FormData) => Promise<DraftContentState>;
  className: string;
  children: ReactNode;
}) {
  const [state, submit, pending] = useActionState(
    async (_previous: DraftContentState, form: FormData) => {
      try {
        return await action(form);
      } catch {
        return { error: draftContentFailure };
      }
    },
    {},
  );
  const error = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error) error.current?.focus();
  }, [state]);
  return (
    <form
      action={submit}
      className={className}
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      {state.error ? (
        <p ref={error} tabIndex={-1} role="alert" className="form-error">
          {state.error}
        </p>
      ) : null}
      <fieldset disabled={pending} className="draft-content-fields">
        {children}
      </fieldset>
      <p role="status">
        {pending ? "Saving draft change…" : (state.success ?? "")}
      </p>
    </form>
  );
}

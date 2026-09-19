"use client";
import { unstable_rethrow } from "next/navigation";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { mutationFailure, type MutationState } from "@/lib/mutation-feedback";

export function MutationForm({
  action,
  className,
  children,
  failureMessage = mutationFailure,
  pendingMessage = "Saving change…",
}: {
  action: (form: FormData) => Promise<MutationState>;
  className?: string;
  children: ReactNode;
  failureMessage?: string;
  pendingMessage?: string;
}) {
  const [state, submit, pending] = useActionState(
    async (_previous: MutationState, form: FormData) => {
      try {
        return await action(form);
      } catch (error) {
        unstable_rethrow(error);
        return { error: failureMessage };
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
      <fieldset disabled={pending} className="mutation-fields">
        {children}
      </fieldset>
      <p role="status">{pending ? pendingMessage : (state.success ?? "")}</p>
    </form>
  );
}

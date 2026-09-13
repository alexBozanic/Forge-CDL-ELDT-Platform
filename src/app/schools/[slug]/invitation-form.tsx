"use client";

import { useActionState } from "react";
import { createInvitation, type InvitationState } from "./actions";

export function InvitationForm({
  organizationId,
  slug,
  assignments,
}: {
  organizationId: string;
  slug: string;
  assignments: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState<InvitationState, FormData>(
    createInvitation,
    {},
  );
  return (
    <div>
      <form action={action} className="form-stack">
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="slug" value={slug} />
        <label>
          Student email
          <input name="email" type="email" required />
        </label>
        <label>
          Optional demonstration assignment
          <select name="assignmentId">
            <option value="">No assignment</option>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.title}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invitation"}
        </button>
      </form>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.token ? (
        <div className="delivery-box" role="status">
          <strong>Local fake delivery — copy now</strong>
          <p>
            This secret is shown once and is not emailed or placed in a URL.
          </p>
          <code>{state.token}</code>
        </div>
      ) : null}
    </div>
  );
}

"use client";
import { useState } from "react";

import { useInvitationAction } from "@/components/use-invitation-action";
import { createInvitation } from "./actions";

export function InvitationForm({
  organizationId,
  slug,
  assignments,
}: {
  organizationId: string;
  slug: string;
  assignments: { id: string; title: string }[];
}) {
  const [email, setEmail] = useState("");
  const { state, submit, pending, errorRef } =
    useInvitationAction(createInvitation);
  return (
    <div>
      <form
        action={submit}
        aria-busy={pending}
        onReset={(event) => event.preventDefault()}
        className="form-stack"
      >
        <fieldset disabled={pending} className="mutation-fields">
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="slug" value={slug} />
          <label>
            Student email
            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
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
        </fieldset>
        <p role="status">{pending ? "Creating invitation..." : ""}</p>
      </form>
      {state.error ? (
        <p ref={errorRef} tabIndex={-1} role="alert" className="form-error">
          {state.error}
        </p>
      ) : null}
      {state.token && !pending ? (
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

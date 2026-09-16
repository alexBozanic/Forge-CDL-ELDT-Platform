"use client";
import { useState } from "react";

import { useInvitationAction } from "@/components/use-invitation-action";
import { createSchoolAdminInvitation } from "./actions";

export function AdminInvitationForm({
  organizationId,
}: {
  organizationId: string;
}) {
  const [email, setEmail] = useState("");
  const { state, submit, pending, errorRef } = useInvitationAction(
    createSchoolAdminInvitation,
  );
  return (
    <div className="admin-invite">
      <form
        action={submit}
        aria-busy={pending}
        onReset={(event) => event.preventDefault()}
        className="form-stack compact-form"
      >
        <fieldset disabled={pending} className="mutation-fields">
          <input type="hidden" name="organizationId" value={organizationId} />
          <label>
            First school administrator email
            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <button className="button" type="submit" disabled={pending}>
            {pending ? "Creating…" : "Invite school administrator"}
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
            This administrator token is shown once. Deliver it only through the
            disposable test channel.
          </p>
          <code>{state.token}</code>
        </div>
      ) : null}
    </div>
  );
}

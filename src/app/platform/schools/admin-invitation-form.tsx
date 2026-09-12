"use client";

import { useActionState } from "react";
import {
  createSchoolAdminInvitation,
  type AdminInvitationState,
} from "./actions";

export function AdminInvitationForm({
  organizationId,
}: {
  organizationId: string;
}) {
  const [state, action, pending] = useActionState<
    AdminInvitationState,
    FormData
  >(createSchoolAdminInvitation, {});
  return (
    <div className="admin-invite">
      <form action={action} className="form-stack compact-form">
        <input type="hidden" name="organizationId" value={organizationId} />
        <label>
          First school administrator email
          <input name="email" type="email" required />
        </label>
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Invite school administrator"}
        </button>
      </form>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.token ? (
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

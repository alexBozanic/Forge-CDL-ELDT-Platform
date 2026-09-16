"use client";
import { unstable_rethrow } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import {
  invitationFailure,
  type InvitationResult,
} from "@/lib/invitation-request";

export function useInvitationAction(
  action: (
    state: InvitationResult,
    form: FormData,
  ) => Promise<InvitationResult>,
) {
  const [state, submit, pending] = useActionState(
    async (_previous: InvitationResult, form: FormData) => {
      try {
        // Do not send a previously displayed secret back with the next request.
        return await action({}, form);
      } catch (error) {
        unstable_rethrow(error);
        return { error: invitationFailure };
      }
    },
    {},
  );
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);
  return { state, submit, pending, errorRef };
}

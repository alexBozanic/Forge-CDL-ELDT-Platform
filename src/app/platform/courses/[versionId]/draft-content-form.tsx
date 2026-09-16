"use client";
import type { ReactNode } from "react";
import { MutationForm } from "@/components/mutation-form";
import {
  draftContentFailure,
  type DraftContentState,
} from "@/lib/draft-content";
export function DraftContentForm(props: {
  action: (form: FormData) => Promise<DraftContentState>;
  className: string;
  children: ReactNode;
}) {
  return (
    <MutationForm
      {...props}
      failureMessage={draftContentFailure}
      pendingMessage="Saving draft change�"
    />
  );
}

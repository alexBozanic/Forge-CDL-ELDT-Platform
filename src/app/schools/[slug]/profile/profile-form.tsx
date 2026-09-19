"use client";
import { unstable_rethrow } from "next/navigation";
import { useActionState, useState, useEffect, useRef } from "react";
import {
  type ProfileState,
  type ProfileField,
  type ProfileValues,
} from "@/lib/student-profile";
import { saveProfile } from "./actions";
export type StudentProfile = {
  legal_first_name: string;
  legal_middle_name: string | null;
  legal_last_name: string;
  date_of_birth: string | null;
  license_or_permit_number: string | null;
  issuing_jurisdiction: string | null;
};
const fields: Array<{
  name: ProfileField;
  label: string;
  required?: boolean;
  maxLength?: number;
  type?: string;
  pattern?: string;
}> = [
  {
    name: "firstName",
    label: "Legal first name",
    required: true,
    maxLength: 100,
  },
  { name: "middleName", label: "Legal middle name (optional)", maxLength: 100 },
  {
    name: "lastName",
    label: "Legal last name",
    required: true,
    maxLength: 100,
  },
  { name: "birthDate", label: "Date of birth", type: "date" },
  { name: "permitNumber", label: "License or permit number", maxLength: 64 },
  {
    name: "jurisdiction",
    label: "Issuing jurisdiction (two-letter code)",
    maxLength: 2,
    pattern: "[A-Za-z]{2}",
  },
];
export function ProfileForm({
  organizationId,
  userId,
  slug,
  profile,
}: {
  organizationId: string;
  userId: string;
  slug: string;
  profile: StudentProfile | null;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    async (previous, form) => {
      try {
        return await saveProfile(previous, form);
      } catch (error) {
        unstable_rethrow(error);
        return {
          error:
            "We could not confirm the profile save. Your entries remain here. Check the current profile before trying again. No automatic retry was made.",
        };
      }
    },
    {},
  );
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);
  // Controlled fields survive React's automatic form reset after an action,
  // including repeated failures with unchanged server-returned values.
  const [values, setValues] = useState<ProfileValues>({
    firstName: profile?.legal_first_name ?? "",
    middleName: profile?.legal_middle_name ?? "",
    lastName: profile?.legal_last_name ?? "",
    birthDate: profile?.date_of_birth ?? "",
    permitNumber: profile?.license_or_permit_number ?? "",
    jurisdiction: profile?.issuing_jurisdiction ?? "",
  });
  return (
    <section className="panel">
      <h2>Student profile</h2>
      <p>
        Save the student’s current details. Changes do not replace information
        in previous completion records.
      </p>
      <form
        action={action}
        className="form-stack"
        aria-busy={pending}
        onReset={(event) => event.preventDefault()}
      >
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="slug" value={slug} />
        {fields.map(({ name, label, ...attributes }) => (
          <label key={name}>
            {label}
            <input
              {...attributes}
              name={name}
              value={values[name]}
              readOnly={pending}
              onChange={(event) =>
                setValues({ ...values, [name]: event.target.value })
              }
              aria-invalid={Boolean(state.fieldErrors?.[name])}
              aria-describedby={
                state.fieldErrors?.[name] ? `profile-${name}-error` : undefined
              }
            />
            {state.fieldErrors?.[name] ? (
              <span id={`profile-${name}-error`} className="form-error">
                {state.fieldErrors[name]}
              </span>
            ) : null}
          </label>
        ))}
        <button className="button" disabled={pending}>
          {pending ? "Saving…" : "Save student profile"}
        </button>
      </form>
      {state.error ? (
        <p ref={errorRef} tabIndex={-1} role="alert" className="form-error">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="form-success">
          Student profile saved.
        </p>
      ) : null}
    </section>
  );
}

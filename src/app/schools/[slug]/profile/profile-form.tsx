"use client";
import { useActionState } from "react";
import { saveProfile } from "./actions";
export type StudentProfile = {
  legal_first_name: string;
  legal_middle_name: string | null;
  legal_last_name: string;
  date_of_birth: string | null;
  license_or_permit_number: string | null;
  issuing_jurisdiction: string | null;
};
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
  const [state, action, pending] = useActionState(saveProfile, {});
  return (
    <section className="panel">
      <h2>Student profile</h2>
      <p>
        Save the student’s current details. Changes do not replace information
        in previous completion records.
      </p>
      <form action={action} className="form-stack">
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="slug" value={slug} />
        <label>
          Legal first name
          <input
            name="firstName"
            required
            maxLength={100}
            defaultValue={profile?.legal_first_name ?? ""}
          />
        </label>
        <label>
          Legal middle name (optional)
          <input
            name="middleName"
            maxLength={100}
            defaultValue={profile?.legal_middle_name ?? ""}
          />
        </label>
        <label>
          Legal last name
          <input
            name="lastName"
            required
            maxLength={100}
            defaultValue={profile?.legal_last_name ?? ""}
          />
        </label>
        <label>
          Date of birth
          <input
            name="birthDate"
            type="date"
            defaultValue={profile?.date_of_birth ?? ""}
          />
        </label>
        <label>
          License or permit number
          <input
            name="permitNumber"
            maxLength={64}
            defaultValue={profile?.license_or_permit_number ?? ""}
          />
        </label>
        <label>
          Issuing jurisdiction (two-letter code)
          <input
            name="jurisdiction"
            pattern="[A-Za-z]{2}"
            maxLength={2}
            placeholder="CO"
            defaultValue={profile?.issuing_jurisdiction ?? ""}
          />
        </label>
        <button className="button" disabled={pending}>
          {pending ? "Saving…" : "Save student profile"}
        </button>
      </form>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.saved ? <p role="status">Student profile saved.</p> : null}
    </section>
  );
}

export const profileFields = [
  "firstName",
  "middleName",
  "lastName",
  "birthDate",
  "permitNumber",
  "jurisdiction",
] as const;
export type ProfileField = (typeof profileFields)[number];
export type ProfileValues = Record<ProfileField, string>;
export type ProfileState = {
  error?: string;
  saved?: boolean;
  values?: ProfileValues;
  fieldErrors?: Partial<Record<ProfileField, string>>;
};
type ProfilePayload = {
  target_organization_id: string;
  target_student_user_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birth_date: string | null;
  permit_number: string | null;
  jurisdiction: string | null;
};

// The callback must use the caller's authenticated client. Database authorization
// remains authoritative; UUID validation is only input validation.
export async function submitProfile(
  form: FormData,
  save: (
    payload: ProfilePayload,
  ) => PromiseLike<{ error: { code?: string } | null }>,
  today = new Date().toISOString().slice(0, 10),
): Promise<ProfileState> {
  const read = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  const values = Object.fromEntries(
    profileFields.map((key) => [key, read(key)]),
  ) as ProfileValues;
  const fieldErrors: NonNullable<ProfileState["fieldErrors"]> = {};
  for (const key of ["firstName", "lastName"] as const) {
    if (!values[key].trim() || Array.from(values[key].trim()).length > 100)
      fieldErrors[key] = "Enter a name between 1 and 100 characters.";
  }
  if (Array.from(values.middleName.trim()).length > 100)
    fieldErrors.middleName = "Use no more than 100 characters.";
  if (Array.from(values.permitNumber.trim()).length > 64)
    fieldErrors.permitNumber = "Use no more than 64 characters.";
  if (
    values.jurisdiction.trim() &&
    !/^[a-z]{2}$/i.test(values.jurisdiction.trim())
  )
    fieldErrors.jurisdiction = "Enter a two-letter jurisdiction code.";
  const birthDate = values.birthDate.trim();
  if (birthDate) {
    const parsed = new Date(`${birthDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== birthDate ||
      birthDate >= today
    )
      fieldErrors.birthDate = "Enter a valid date before today.";
  }
  if (Object.keys(fieldErrors).length)
    return {
      values,
      fieldErrors,
      error: "Check the highlighted fields. Your entries have been kept.",
    };

  const organizationId = read("organizationId").trim();
  const userId = read("userId").trim();
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    !uuid.test(organizationId) ||
    !uuid.test(userId) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(read("slug"))
  )
    return {
      values,
      error:
        "The student or school could not be identified. Reopen the student profile from your school workspace.",
    };
  const failure =
    "Profile could not be saved. Your entries have been kept. No automatic retry was made; refresh the record to check whether it saved before trying again.";
  try {
    const { error } = await save({
      target_organization_id: organizationId,
      target_student_user_id: userId,
      first_name: values.firstName.trim(),
      middle_name: values.middleName.trim() || null,
      last_name: values.lastName.trim(),
      birth_date: birthDate || null,
      permit_number: values.permitNumber.trim() || null,
      jurisdiction: values.jurisdiction.trim().toUpperCase() || null,
    });
    if (error)
      return {
        values,
        error:
          error.code === "42501"
            ? "An active student membership and profile access are required. Your entries have been kept."
            : failure,
      };
    return { values, saved: true };
  } catch {
    return { values, error: failure };
  }
}

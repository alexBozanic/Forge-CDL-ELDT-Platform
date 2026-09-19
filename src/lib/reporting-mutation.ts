import { mutationFailure, type MutationState } from "./mutation-feedback.ts";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function saveReportingMutation(
  operation: "identifiers" | "prepare" | "transition",
  form: FormData,
  requestKey: string | null,
  save: (
    name: string,
    payload: Record<string, unknown>,
  ) => PromiseLike<{ error: { code?: string } | null }>,
  today = new Date().toISOString().slice(0, 10),
): Promise<MutationState> {
  function value(name: string) {
    const raw = form.get(name);
    return typeof raw === "string" ? raw.trim() : "";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value("slug")))
    return { error: "Reopen the reporting queue before making this change." };
  let name: string, payload: Record<string, unknown>;
  if (operation === "identifiers") {
    if (
      !["organizationId", "studentUserId"].every((field) =>
        uuid.test(value(field)),
      )
    )
      return {
        error:
          "Reopen the reporting record to identify the school and student.",
      };
    const birth = value("dateOfBirth"),
      parsed = new Date(`${birth}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== birth ||
      birth >= today
    )
      return { error: "Enter a valid date of birth before today." };
    if (
      !value("licenseNumber") ||
      Array.from(value("licenseNumber")).length > 64
    )
      return {
        error: "Enter a license or permit number of 1 to 64 characters.",
      };
    if (!/^[a-z]{2}$/i.test(value("jurisdiction")))
      return { error: "Enter a two-letter issuing jurisdiction." };
    if (!value("providerIdentifier"))
      return { error: "Enter the school's provider identifier." };
    name = "update_reporting_identifiers";
    payload = {
      target_organization_id: value("organizationId"),
      target_student_user_id: value("studentUserId"),
      student_date_of_birth: birth,
      student_license_or_permit_number: value("licenseNumber"),
      student_issuing_jurisdiction: value("jurisdiction").toUpperCase(),
      organization_provider_identifier: value("providerIdentifier"),
    };
  } else {
    if (
      !uuid.test(value("reportingId")) ||
      !requestKey ||
      !uuid.test(requestKey)
    )
      return {
        error: "Reopen this reporting record before making the change.",
      };
    payload = {
      target_reporting_record_id: value("reportingId"),
      request_idempotency_key: requestKey,
    };
    if (operation === "transition") {
      if (!["submitted", "accepted", "rejected"].includes(value("status")))
        return { error: "Choose a supported reporting status." };
      if (!value("reason"))
        return {
          error: "Enter the evidence or reason for this reporting change.",
        };
      name = "transition_reporting";
      payload.target_status = value("status");
      payload.transition_reason = value("reason");
    } else name = "prepare_reporting_record";
  }
  try {
    const { error } = await save(name, payload);
    if (error)
      return {
        error:
          error.code === "55000"
            ? "This reporting change is not available in the record's current state. Refresh the reporting queue and review its history."
            : mutationFailure,
      };
    return {
      success:
        "Reporting record updated. Review the saved status and history. No external submission was sent.",
    };
  } catch {
    return { error: mutationFailure };
  }
}

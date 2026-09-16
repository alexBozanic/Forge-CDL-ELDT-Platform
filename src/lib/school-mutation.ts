import { mutationFailure, type MutationState } from "./mutation-feedback.ts";
export type SchoolMutation =
  | "settings"
  | "revokeInvitation"
  | "createAssignment"
  | "withdrawAssignment"
  | "enrollStudent";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function saveSchoolMutation(
  operation: SchoolMutation,
  form: FormData,
  save: (
    name: string,
    payload: Record<string, unknown>,
  ) => PromiseLike<{ error: unknown }>,
): Promise<MutationState> {
  function value(name: string) {
    const raw = form.get(name);
    return typeof raw === "string" ? raw.trim() : "";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value("slug")))
    return { error: "Reopen the school workspace before making this change." };
  const requiredIds = {
    settings: ["organizationId"],
    revokeInvitation: ["invitationId"],
    createAssignment: ["organizationId", "courseVersionId"],
    withdrawAssignment: ["assignmentId"],
    enrollStudent: ["organizationId", "userId", "assignmentId"],
  };
  if (requiredIds[operation].some((field) => !uuid.test(value(field))))
    return {
      error:
        "Choose a valid school, student, course or assignment before saving.",
    };
  let name: string, payload: Record<string, unknown>;
  switch (operation) {
    case "settings": {
      if (!value("name")) return { error: "Enter the school name." };
      if (value("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email")))
        return { error: "Enter a valid contact email or leave it blank." };
      if (
        !["primaryColor", "accentColor"].every((field) =>
          /^#[0-9a-f]{6}$/i.test(value(field)),
        )
      )
        return { error: "Choose valid school colors." };
      name = "update_organization_settings";
      payload = {
        target_organization_id: value("organizationId"),
        organization_name: value("name"),
        organization_email: value("email"),
        primary_color: value("primaryColor"),
        accent_color: value("accentColor"),
      };
      break;
    }
    case "revokeInvitation":
      name = "revoke_invitation";
      payload = { target_invitation_id: value("invitationId") };
      break;
    case "createAssignment":
      if (!value("title")) return { error: "Enter an assignment title." };
      name = "create_course_assignment";
      payload = {
        target_organization_id: value("organizationId"),
        target_course_version_id: value("courseVersionId"),
        assignment_title: value("title"),
      };
      break;
    case "withdrawAssignment":
      if (!value("reason"))
        return { error: "Enter a reason for withdrawing this assignment." };
      name = "withdraw_course_assignment";
      payload = {
        target_assignment_id: value("assignmentId"),
        reason: value("reason"),
      };
      break;
    case "enrollStudent":
      name = "create_student_enrollment";
      payload = {
        target_organization_id: value("organizationId"),
        target_student_user_id: value("userId"),
        target_assignment_id: value("assignmentId"),
      };
      break;
  }
  try {
    const result = await save(name, payload);
    if (result.error) return { error: mutationFailure };
    return {
      success:
        "Change saved. Review the updated record before making another change.",
    };
  } catch {
    return { error: mutationFailure };
  }
}

export type InvitationResult = { token?: string; error?: string };
export const invitationFailure =
  "We could not confirm the invitation. Check pending invitations before trying again. No automatic retry was made.";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requestInvitation(
  kind: "student" | "administrator",
  form: FormData,
  issue: (values: {
    organizationId: string;
    email: string;
    assignmentId: string | null;
  }) => Promise<InvitationResult>,
): Promise<InvitationResult> {
  const value = (name: string) => {
    const raw = form.get(name);
    return typeof raw === "string" ? raw.trim() : "";
  };
  const organizationId = value("organizationId");
  const email = value("email").toLowerCase();
  const assignmentId =
    kind === "student" ? value("assignmentId") || null : null;
  if (!uuid.test(organizationId))
    return { error: "Choose a school before creating an invitation." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Enter a valid invitation email." };
  if (assignmentId && !uuid.test(assignmentId))
    return { error: "Choose an existing assignment or no assignment." };
  if (kind === "student" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value("slug")))
    return {
      error: "Open the school page again before creating an invitation.",
    };
  try {
    const result = await issue({ organizationId, email, assignmentId });
    if (result.error || !result.token) return { error: invitationFailure };
    return { token: result.token };
  } catch {
    return { error: invitationFailure };
  }
}

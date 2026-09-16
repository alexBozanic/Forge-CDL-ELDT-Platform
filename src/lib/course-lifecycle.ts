import { mutationFailure, type MutationState } from "./mutation-feedback.ts";
export async function saveCourseLifecycle(
  operation: "review" | "publish" | "retire",
  form: FormData,
  save: (
    name: string,
    payload: Record<string, unknown>,
  ) => PromiseLike<{ error: { code?: string } | null }>,
): Promise<MutationState> {
  function value(name: string) {
    const raw = form.get(name);
    return typeof raw === "string" ? raw.trim() : "";
  }
  const versionId = value("versionId"),
    hash = value("manifestHash");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      versionId,
    )
  )
    return { error: "Reopen the version from the course library." };
  const payload: Record<string, unknown> = { target_version_id: versionId };
  let name: string;
  if (operation === "retire") {
    if (!value("reason")) return { error: "Enter a retirement reason." };
    name = "retire_course_version";
    payload.reason = value("reason");
  } else {
    if (!/^[0-9a-f]{64}$/.test(hash))
      return {
        error:
          "Reload the version and review the displayed content before continuing.",
      };
    payload.expected_manifest_hash = hash;
    if (operation === "review") {
      if (!["approved", "changes_requested"].includes(value("decision")))
        return { error: "Choose a valid review decision." };
      if (!value("notes"))
        return { error: "Enter review notes for this exact content." };
      name = "review_course_version_at_hash";
      payload.review_decision = value("decision");
      payload.review_notes = value("notes");
    } else name = "publish_course_version_at_hash";
  }
  try {
    const { error } = await save(name, payload);
    if (error)
      return {
        error:
          error.code === "40001"
            ? "The draft changed after this page was opened. Reload and review the updated content before recording a review or publishing."
            : error.code === "42883" || error.code === "PGRST202"
              ? "The review safeguard is temporarily unavailable. Contact the platform administrator before continuing."
              : error.code === "55000"
                ? "This version is not ready for that action. Check its status, content and current review before continuing."
                : mutationFailure,
      };
    return {
      success:
        operation === "review"
          ? "Review recorded for the displayed manifest."
          : operation === "publish"
            ? "The reviewed version was published."
            : "Version retired for future assignment.",
    };
  } catch {
    return { error: mutationFailure };
  }
}

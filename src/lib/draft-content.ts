export type DraftContentState = { error?: string; success?: string };
export type DraftContentOperation =
  | "addModule"
  | "saveModule"
  | "addLesson"
  | "saveLesson";
export const draftContentFailure =
  "We could not confirm that the draft change was saved. Your entries remain here. Check the draft in a new tab before trying again; no automatic retry was made.";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const operations = {
  addModule: "add_course_module",
  saveModule: "update_course_module",
  addLesson: "add_course_lesson",
  saveLesson: "update_course_lesson",
};
export async function editDraftContent(
  operation: DraftContentOperation,
  form: FormData,
  save: (
    name: string,
    payload: Record<string, unknown>,
  ) => PromiseLike<{ error: unknown }>,
): Promise<DraftContentState> {
  function value(name: string) {
    const v = form.get(name);
    return typeof v === "string" ? v.trim() : "";
  }
  const versionId = value("versionId"),
    moduleId = value("moduleId"),
    lessonId = value("lessonId");
  const lesson = operation === "addLesson" || operation === "saveLesson";
  if (
    !uuid.test(versionId) ||
    ((operation === "saveModule" || operation === "addLesson") &&
      !uuid.test(moduleId)) ||
    (operation === "saveLesson" && !uuid.test(lessonId))
  )
    return {
      error: "Reopen this draft from the course library before editing.",
    };
  if (!value("title")) return { error: "Enter a title." };
  const position = Number(value("position"));
  if (!Number.isInteger(position) || position < 1 || position > 2147483647)
    return { error: "Position must be a positive whole number." };
  const minutes = Number(value("minutes"));
  if (lesson && !value("body"))
    return { error: "Enter the lesson's Markdown content." };
  if (lesson && (!Number.isInteger(minutes) || minutes < 1 || minutes > 240))
    return { error: "Estimated minutes must be a whole number from 1 to 240." };
  const payload: Record<string, unknown> = lesson
    ? {
        lesson_title: value("title"),
        lesson_body_markdown: value("body"),
        lesson_position: position,
        lesson_estimated_minutes: minutes,
      }
    : { module_title: value("title"), module_position: position };
  if (operation === "addModule" || operation === "addLesson")
    payload.target_version_id = versionId;
  if (operation === "saveModule" || operation === "addLesson")
    payload.target_module_id = moduleId;
  if (operation === "saveLesson") payload.target_lesson_id = lessonId;
  try {
    const result = await save(operations[operation], payload);
    if (result.error) return { error: draftContentFailure };
    return {
      success:
        "Draft change saved. Review the updated content before making another change.",
    };
  } catch {
    return { error: draftContentFailure };
  }
}

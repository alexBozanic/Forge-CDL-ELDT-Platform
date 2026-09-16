import {
  draftContentFailure,
  type DraftContentState,
} from "./draft-content.ts";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function saveDraftSettings(
  kind: "metadata" | "assessment",
  form: FormData,
  save: (
    name: string,
    payload: Record<string, unknown>,
  ) => PromiseLike<{ error: unknown }>,
): Promise<DraftContentState> {
  function value(name: string) {
    const raw = form.get(name);
    return typeof raw === "string" ? raw.trim() : "";
  }
  const versionId = value("versionId"),
    title = value("title");
  if (!uuid.test(versionId))
    return {
      error: "Reopen this draft from the course library before editing.",
    };
  if (!title || title.length > 160)
    return { error: "Enter a title of 1 to 160 characters." };
  let name: string;
  let payload: Record<string, unknown>;
  if (kind === "metadata") {
    if (!value("description")) return { error: "Enter a version description." };
    name = "update_course_version_draft";
    payload = {
      target_version_id: versionId,
      version_title: title,
      version_description: value("description"),
    };
  } else {
    const assessmentKind = value("kind"),
      lessonId = value("lessonId");
    if (!["lesson_quiz", "final_exam"].includes(assessmentKind))
      return { error: "Choose a lesson quiz or final exam." };
    if (assessmentKind === "lesson_quiz" && !uuid.test(lessonId))
      return { error: "Choose a lesson for this quiz." };
    const fields = [
      ["position", "Position", 1, 2147483647],
      ["questionCount", "Questions selected", 1, 2147483647],
      [
        "passingPercent",
        "Pass percent",
        assessmentKind === "final_exam" ? 80 : 1,
        100,
      ],
      ["timeLimit", "Minutes", 1, 240],
    ] as const;
    for (const [field, label, min, max] of fields) {
      const number = Number(value(field));
      if (!Number.isInteger(number) || number < min || number > max)
        return {
          error: `${label} must be a whole number from ${min} to ${max}.`,
        };
    }
    name = "add_assessment";
    payload = {
      target_version_id: versionId,
      target_lesson_id: assessmentKind === "lesson_quiz" ? lessonId : null,
      assessment_kind: assessmentKind,
      assessment_title: title,
      assessment_position: Number(value("position")),
      assessment_question_count: Number(value("questionCount")),
      assessment_passing_percent: Number(value("passingPercent")),
      assessment_time_limit_minutes: Number(value("timeLimit")),
    };
  }
  try {
    const result = await save(name, payload);
    if (result.error) return { error: draftContentFailure };
    return {
      success:
        "Draft change saved. Review the updated content before making another change.",
    };
  } catch {
    return { error: draftContentFailure };
  }
}

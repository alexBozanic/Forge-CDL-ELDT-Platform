"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth";
import { requiredString } from "@/lib/forms";
import {
  safeAuthoringError,
  type AssessmentFormState,
  validateAssessmentQuestion,
  validateAssessmentTopic,
} from "@/lib/assessment-authoring";

export type { AssessmentFormState } from "@/lib/assessment-authoring";

async function platformClient() {
  const context = await getAuthorizationContext();
  if (!context.isPlatformAdministrator)
    throw new Error("Platform administrator required");
  return context.supabase;
}

async function rpc(name: string, values: Record<string, unknown>) {
  const supabase = await platformClient();
  const result = await supabase.rpc(name, values);
  if (result.error) throw result.error;
  return result.data;
}

export async function createCourse(formData: FormData) {
  const courseId = await rpc("create_course", {
    course_title: requiredString(formData, "title"),
    course_description: requiredString(formData, "description"),
    demo_content: formData.get("isDemo") === "on",
  });
  const versionId = await rpc("create_course_version", {
    target_course_id: courseId,
  });
  redirect(`/platform/courses/${versionId}`);
}

export async function createRevision(formData: FormData) {
  const versionId = await rpc("create_course_version", {
    target_course_id: requiredString(formData, "courseId"),
  });
  redirect(`/platform/courses/${versionId}`);
}

export async function saveVersion(formData: FormData) {
  const versionId = requiredString(formData, "versionId");
  await rpc("update_course_version_draft", {
    target_version_id: versionId,
    version_title: requiredString(formData, "title"),
    version_description: requiredString(formData, "description"),
  });
  revalidatePath(`/platform/courses/${versionId}`);
}

export async function addModule(formData: FormData) {
  const versionId = requiredString(formData, "versionId");
  await rpc("add_course_module", {
    target_version_id: versionId,
    module_title: requiredString(formData, "title"),
    module_position: Number(requiredString(formData, "position")),
  });
  revalidatePath(`/platform/courses/${versionId}`);
}

export async function saveModule(formData: FormData) {
  const versionId = requiredString(formData, "versionId");
  await rpc("update_course_module", {
    target_module_id: requiredString(formData, "moduleId"),
    module_title: requiredString(formData, "title"),
    module_position: Number(requiredString(formData, "position")),
  });
  revalidatePath(`/platform/courses/${versionId}`);
}

function lessonValues(formData: FormData) {
  return {
    lesson_title: requiredString(formData, "title"),
    lesson_body_markdown: requiredString(formData, "body"),
    lesson_position: Number(requiredString(formData, "position")),
    lesson_estimated_minutes: Number(requiredString(formData, "minutes")),
  };
}

export async function addLesson(formData: FormData) {
  const versionId = requiredString(formData, "versionId");
  await rpc("add_course_lesson", {
    target_version_id: versionId,
    target_module_id: requiredString(formData, "moduleId"),
    ...lessonValues(formData),
  });
  revalidatePath(`/platform/courses/${versionId}`);
}

export async function saveLesson(formData: FormData) {
  const versionId = requiredString(formData, "versionId");
  await rpc("update_course_lesson", {
    target_lesson_id: requiredString(formData, "lessonId"),
    ...lessonValues(formData),
  });
  revalidatePath(`/platform/courses/${versionId}`);
}

export async function addAssessment(formData: FormData) {
  const versionId = requiredString(formData, "versionId");
  await rpc("add_assessment", {
    target_version_id: versionId,
    target_lesson_id:
      formData.get("kind") === "lesson_quiz"
        ? requiredString(formData, "lessonId")
        : null,
    assessment_kind: requiredString(formData, "kind"),
    assessment_title: requiredString(formData, "title"),
    assessment_position: Number(requiredString(formData, "position")),
    assessment_question_count: Number(
      requiredString(formData, "questionCount"),
    ),
    assessment_passing_percent: Number(
      requiredString(formData, "passingPercent"),
    ),
    assessment_time_limit_minutes: Number(
      requiredString(formData, "timeLimit"),
    ),
  });
  revalidatePath(`/platform/courses/${versionId}`);
}

export async function addAssessmentTopic(
  _previousState: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  const versionId = String(formData.get("versionId") ?? "").trim();
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();
  if (!versionId || !assessmentId) return { error: safeAuthoringError() };
  let validated;
  try {
    validated = validateAssessmentTopic(formData);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : safeAuthoringError(),
      values: {
        topicCode: String(formData.get("topicCode") ?? ""),
        requiredCount: String(formData.get("requiredCount") ?? ""),
      },
    };
  }
  try {
    await rpc("add_assessment_topic", {
      target_version_id: versionId,
      target_assessment_id: assessmentId,
      assessment_topic_code: validated.topicCode,
      topic_required_count: validated.requiredCount,
    });
    revalidatePath(`/platform/courses/${versionId}`);
    return { success: "Blueprint topic added." };
  } catch {
    return { error: safeAuthoringError(), values: validated.values };
  }
}

export async function addAssessmentQuestion(
  _previousState: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  const versionId = String(formData.get("versionId") ?? "").trim();
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();
  if (!versionId || !assessmentId) return { error: safeAuthoringError() };
  let supabase: Awaited<ReturnType<typeof platformClient>>;
  try {
    supabase = await platformClient();
  } catch {
    return { error: safeAuthoringError() };
  }
  let allowedTopics: string[];
  try {
    const { data: topics, error: topicsError } = await supabase
      .from("assessment_blueprint_topics")
      .select("topic_code")
      .eq("course_version_id", versionId)
      .eq("assessment_id", assessmentId);
    if (topicsError) throw topicsError;
    allowedTopics = topics?.map((topic) => topic.topic_code) ?? [];
  } catch {
    return {
      error: safeAuthoringError(),
      values: Object.fromEntries(
        ["topicCode", "prompt", "options", "correctOption", "rationale"].map(
          (key) => [key, String(formData.get(key) ?? "")],
        ),
      ),
    };
  }
  let validated;
  try {
    validated = validateAssessmentQuestion(formData, allowedTopics);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : safeAuthoringError(),
      values: Object.fromEntries(
        ["topicCode", "prompt", "options", "correctOption", "rationale"].map(
          (key) => [key, String(formData.get(key) ?? "")],
        ),
      ),
    };
  }
  try {
    const result = await supabase.rpc("add_assessment_question", {
      target_version_id: versionId,
      target_assessment_id: assessmentId,
      question_topic_code: validated.values.topicCode,
      question_prompt: validated.values.prompt,
      question_rationale: validated.values.rationale,
      option_texts: validated.options,
      correct_option_number: validated.correctOption,
    });
    if (result.error) throw result.error;
    revalidatePath(`/platform/courses/${versionId}`);
    return { success: "Question and private answer key added." };
  } catch {
    return { error: safeAuthoringError(), values: validated.values };
  }
}

export async function reviewVersion(formData: FormData) {
  const versionId = requiredString(formData, "versionId");
  await rpc("review_course_version", {
    target_version_id: versionId,
    review_decision: requiredString(formData, "decision"),
    review_notes: requiredString(formData, "notes"),
  });
  revalidatePath(`/platform/courses/${versionId}`);
}

export async function publishVersion(formData: FormData) {
  const versionId = requiredString(formData, "versionId");
  await rpc("publish_course_version", { target_version_id: versionId });
  revalidatePath(`/platform/courses/${versionId}`);
}

export async function retireVersion(formData: FormData) {
  const versionId = requiredString(formData, "versionId");
  await rpc("retire_course_version", {
    target_version_id: versionId,
    reason: requiredString(formData, "reason"),
  });
  revalidatePath(`/platform/courses/${versionId}`);
}

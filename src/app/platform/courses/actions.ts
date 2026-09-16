"use server";
import { saveDraftSettings } from "@/lib/draft-settings";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth";
import { requiredString } from "@/lib/forms";
import {
  editDraftContent,
  type DraftContentOperation,
} from "@/lib/draft-content";
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

async function editSettings(kind: "metadata" | "assessment", form: FormData) {
  const state = await saveDraftSettings(kind, form, async (name, payload) => {
    const supabase = await platformClient();
    return supabase.rpc(name, payload);
  });
  if (state.success)
    revalidatePath(`/platform/courses/${String(form.get("versionId")).trim()}`);
  return state;
}
export async function saveVersion(form: FormData) {
  return editSettings("metadata", form);
}

async function editContent(operation: DraftContentOperation, form: FormData) {
  const state = await editDraftContent(
    operation,
    form,
    async (name, payload) => {
      const supabase = await platformClient();
      return supabase.rpc(name, payload);
    },
  );
  if (state.success)
    revalidatePath(`/platform/courses/${String(form.get("versionId")).trim()}`);
  return state;
}
export async function addModule(form: FormData) {
  return editContent("addModule", form);
}
export async function saveModule(form: FormData) {
  return editContent("saveModule", form);
}
export async function addLesson(form: FormData) {
  return editContent("addLesson", form);
}
export async function saveLesson(form: FormData) {
  return editContent("saveLesson", form);
}

export async function addAssessment(form: FormData) {
  return editSettings("assessment", form);
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

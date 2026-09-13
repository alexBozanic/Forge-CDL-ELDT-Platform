"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth";
import { requiredString } from "@/lib/forms";

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

export async function addAssessmentTopic(formData: FormData) {
  const versionId = requiredString(formData, "versionId");
  await rpc("add_assessment_topic", {
    target_version_id: versionId,
    target_assessment_id: requiredString(formData, "assessmentId"),
    assessment_topic_code: requiredString(formData, "topicCode"),
    topic_required_count: Number(requiredString(formData, "requiredCount")),
  });
  revalidatePath(`/platform/courses/${versionId}`);
}

export async function addAssessmentQuestion(formData: FormData) {
  const versionId = requiredString(formData, "versionId");
  const options = requiredString(formData, "options")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  await rpc("add_assessment_question", {
    target_version_id: versionId,
    target_assessment_id: requiredString(formData, "assessmentId"),
    question_topic_code: requiredString(formData, "topicCode"),
    question_prompt: requiredString(formData, "prompt"),
    question_rationale: requiredString(formData, "rationale"),
    option_texts: options,
    correct_option_number: Number(requiredString(formData, "correctOption")),
  });
  revalidatePath(`/platform/courses/${versionId}`);
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

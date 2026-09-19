import { mutationFailure, type MutationState } from "./mutation-feedback.ts";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Call = (
  name: string,
  payload: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: unknown }>;
function value(form: FormData, name: string) {
  const raw = form.get(name);
  return typeof raw === "string" ? raw.trim() : "";
}
export async function createCourseDraft(
  kind: "course" | "revision",
  form: FormData,
  call: Call,
): Promise<MutationState & { versionId?: string; courseCreated?: boolean }> {
  let courseId = value(form, "courseId");
  if (kind === "course") {
    const title = value(form, "title");
    if (!title || Array.from(title).length > 160)
      return { error: "Enter a course title of 1 to 160 characters." };
    if (!value(form, "description"))
      return { error: "Enter a course description." };
  } else if (!uuid.test(courseId))
    return {
      error: "Choose a course from the library before creating a revision.",
    };
  let courseCreated = false;
  try {
    if (kind === "course") {
      const result = await call("create_course", {
        course_title: value(form, "title"),
        course_description: value(form, "description"),
        demo_content: form.get("isDemo") === "on",
      });
      if (
        result.error ||
        typeof result.data !== "string" ||
        !uuid.test(result.data)
      )
        return {
          error:
            "We could not confirm course creation. Check the course library before creating another course. No automatic retry was made.",
        };
      courseId = result.data;
      courseCreated = true;
    }
    const result = await call("create_course_version", {
      target_course_id: courseId,
    });
    if (
      !result.error &&
      typeof result.data === "string" &&
      uuid.test(result.data)
    )
      return { versionId: result.data, courseCreated };
  } catch {
    // A transport failure may follow a committed mutation. Never retry here.
  }
  return {
    courseCreated,
    error: courseCreated
      ? "Course created, but its first draft could not be confirmed. Check that course in the library for an existing draft before creating a revision. Do not create the course again."
      : "We could not confirm the new course or revision. Check the course library for an existing record before trying again. No automatic retry was made.",
  };
}
export async function createSchoolRecord(
  form: FormData,
  call: Call,
): Promise<MutationState> {
  const name = value(form, "name"),
    slug = value(form, "slug"),
    email = value(form, "email");
  if (!name || Array.from(name).length > 160)
    return { error: "Enter a school name of 1 to 160 characters." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    return {
      error:
        "Use lowercase letters, numbers and single hyphens for the school slug.",
    };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Enter a valid contact email or leave it blank." };
  try {
    const result = await call("create_organization", {
      organization_name: name,
      organization_slug: slug,
      organization_email: email || null,
    });
    if (result.error) return { error: mutationFailure };
    return { success: "School created. Review its entry in the school list." };
  } catch {
    return { error: mutationFailure };
  }
}

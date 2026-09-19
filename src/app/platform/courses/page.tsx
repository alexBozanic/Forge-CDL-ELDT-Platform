import { MutationForm } from "@/components/mutation-form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth";
import { createCourse, createRevision } from "./actions";

export default async function CoursesPage() {
  const { supabase, isPlatformAdministrator } = await getAuthorizationContext();
  if (!isPlatformAdministrator) notFound();
  const { data: courses, error } = await supabase
    .from("courses")
    .select(
      "id, title, description, is_demo, course_versions(id, version_number, status)",
    )
    .order("created_at");
  if (error) throw error;
  return (
    <main className="container main" id="main-content">
      <p className="kicker">Platform-only authoring</p>
      <h1>Versioned courses</h1>
      <div className="two-column">
        <section className="panel">
          <h2>Start a course</h2>
          <p>
            Every revision is a separate draft. Publishing requires an
            exact-manifest content review.
          </p>
          <MutationForm action={createCourse} className="form-stack">
            <label>
              Course title
              <input name="title" required maxLength={160} />
            </label>
            <label>
              Description
              <textarea name="description" required />
            </label>
            <label className="check-label">
              <input name="isDemo" type="checkbox" /> Demonstration content
              (demo schools only)
            </label>
            <button className="button">Create course and draft</button>
          </MutationForm>
        </section>
        <section>
          <h2>Course library</h2>
          <div className="list-stack">
            {courses?.map((course) => (
              <article className="gate" key={course.id}>
                <h3>{course.title}</h3>
                <p>
                  {course.is_demo
                    ? "Demonstration content"
                    : "Non-demo content"}
                </p>
                <div className="list-stack">
                  {course.course_versions?.map((version) => (
                    <Link
                      href={`/platform/courses/${version.id}`}
                      key={version.id}
                    >
                      Version {version.version_number} · {version.status}
                    </Link>
                  ))}
                </div>
                <MutationForm action={createRevision}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <button className="text-button">Create new revision</button>
                </MutationForm>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

import { notFound } from "next/navigation";
import { SafeMarkdown } from "@/components/safe-markdown";
import { getAuthorizationContext } from "@/lib/auth";
import {
  addLesson,
  addModule,
  publishVersion,
  retireVersion,
  reviewVersion,
  saveLesson,
  saveModule,
  saveVersion,
} from "../actions";

export default async function CourseVersionPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  const { supabase, isPlatformAdministrator } = await getAuthorizationContext();
  if (!isPlatformAdministrator) notFound();
  const [versionResult, modulesResult, lessonsResult, reviewsResult] =
    await Promise.all([
      supabase
        .from("course_versions")
        .select(
          "id, course_id, version_number, title, description, status, manifest_hash, retirement_reason",
        )
        .eq("id", versionId)
        .single(),
      supabase
        .from("course_modules")
        .select("id, title, position")
        .eq("course_version_id", versionId)
        .order("position"),
      supabase
        .from("course_lessons")
        .select(
          "id, module_id, title, body_markdown, position, estimated_minutes",
        )
        .eq("course_version_id", versionId)
        .order("position"),
      supabase
        .from("curriculum_reviews")
        .select("id, manifest_hash, decision, notes, reviewed_at")
        .eq("course_version_id", versionId)
        .order("reviewed_at", { ascending: false }),
    ]);
  if (versionResult.error || !versionResult.data) notFound();
  for (const result of [modulesResult, lessonsResult, reviewsResult])
    if (result.error) throw result.error;
  const version = versionResult.data;
  const modules = modulesResult.data ?? [];
  const lessons = lessonsResult.data ?? [];
  const reviews = reviewsResult.data ?? [];
  const isDraft = version.status === "draft";
  return (
    <main className="container main" id="main-content">
      <p className="kicker">
        Platform authoring ·{" "}
        {isDraft ? "Mutable draft" : "Immutable publication"}
      </p>
      <h1>{version.title}</h1>
      <p>
        Version {version.version_number} · {version.status}
      </p>
      <p className="hash-line">
        Manifest hash: <code>{version.manifest_hash}</code>
      </p>
      {isDraft ? (
        <section className="panel">
          <h2>Version metadata</h2>
          <form action={saveVersion} className="form-stack">
            <input type="hidden" name="versionId" value={version.id} />
            <label>
              Title
              <input name="title" defaultValue={version.title} required />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={version.description}
                required
              />
            </label>
            <button className="button">Save draft metadata</button>
          </form>
        </section>
      ) : null}
      <div className="authoring-layout">
        <section>
          <h2>
            {isDraft ? "Draft content and safe preview" : "Published content"}
          </h2>
          {modules.map((module) => (
            <article className="module-card" key={module.id}>
              {isDraft ? (
                <form action={saveModule} className="inline-form">
                  <input type="hidden" name="versionId" value={version.id} />
                  <input type="hidden" name="moduleId" value={module.id} />
                  <input
                    name="position"
                    type="number"
                    min="1"
                    defaultValue={module.position}
                    aria-label="Module position"
                  />
                  <input
                    name="title"
                    defaultValue={module.title}
                    aria-label="Module title"
                    required
                  />
                  <button className="text-button">Save module</button>
                </form>
              ) : (
                <h3>
                  {module.position}. {module.title}
                </h3>
              )}
              {lessons
                .filter((lesson) => lesson.module_id === module.id)
                .map((lesson) => (
                  <div className="lesson-preview" key={lesson.id}>
                    {isDraft ? (
                      <form action={saveLesson} className="form-stack">
                        <input
                          type="hidden"
                          name="versionId"
                          value={version.id}
                        />
                        <input
                          type="hidden"
                          name="lessonId"
                          value={lesson.id}
                        />
                        <label>
                          Lesson title
                          <input
                            name="title"
                            defaultValue={lesson.title}
                            required
                          />
                        </label>
                        <div className="inline-form">
                          <label>
                            Position
                            <input
                              name="position"
                              type="number"
                              min="1"
                              defaultValue={lesson.position}
                              required
                            />
                          </label>
                          <label>
                            Minutes
                            <input
                              name="minutes"
                              type="number"
                              min="1"
                              max="240"
                              defaultValue={lesson.estimated_minutes}
                              required
                            />
                          </label>
                        </div>
                        <label>
                          Safe Markdown source
                          <textarea
                            name="body"
                            rows={8}
                            defaultValue={lesson.body_markdown}
                            required
                          />
                        </label>
                        <button className="text-button">Save lesson</button>
                      </form>
                    ) : (
                      <>
                        <h4>{lesson.title}</h4>
                        <p>{lesson.estimated_minutes} minutes</p>
                      </>
                    )}
                    <SafeMarkdown markdown={lesson.body_markdown} />
                  </div>
                ))}
              {isDraft ? (
                <form action={addLesson} className="form-stack compact-editor">
                  <input type="hidden" name="versionId" value={version.id} />
                  <input type="hidden" name="moduleId" value={module.id} />
                  <h4>Add lesson</h4>
                  <label>
                    Title
                    <input name="title" required />
                  </label>
                  <div className="inline-form">
                    <label>
                      Position
                      <input name="position" type="number" min="1" required />
                    </label>
                    <label>
                      Minutes
                      <input
                        name="minutes"
                        type="number"
                        min="1"
                        max="240"
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Safe Markdown
                    <textarea name="body" rows={6} required />
                  </label>
                  <button className="button">Add lesson</button>
                </form>
              ) : null}
            </article>
          ))}
          {isDraft ? (
            <form action={addModule} className="panel form-stack">
              <input type="hidden" name="versionId" value={version.id} />
              <h3>Add module</h3>
              <label>
                Title
                <input name="title" required />
              </label>
              <label>
                Position
                <input name="position" type="number" min="1" required />
              </label>
              <button className="button">Add module</button>
            </form>
          ) : null}
        </section>
        <aside className="panel review-sidebar">
          <h2>Review record</h2>
          <p>
            A content review is bound to this exact hash. It is not instructor
            qualification, certification, or a compliance finding.
          </p>
          {reviews.map((review) => (
            <div className="review-record" key={review.id}>
              <strong>{review.decision}</strong>
              <p>{review.notes}</p>
              <small>
                {new Date(review.reviewed_at).toLocaleString()} ·{" "}
                {review.manifest_hash === version.manifest_hash
                  ? "current hash"
                  : "stale hash"}
              </small>
            </div>
          ))}
          {isDraft ? (
            <>
              <form action={reviewVersion} className="form-stack">
                <input type="hidden" name="versionId" value={version.id} />
                <label>
                  Decision
                  <select name="decision">
                    <option value="changes_requested">Changes requested</option>
                    <option value="approved">
                      Approved for software publication
                    </option>
                  </select>
                </label>
                <label>
                  Review notes
                  <textarea name="notes" required />
                </label>
                <button className="button secondary">
                  Record exact-hash review
                </button>
              </form>
              <form action={publishVersion}>
                <input type="hidden" name="versionId" value={version.id} />
                <button className="button">Publish immutable version</button>
              </form>
            </>
          ) : version.status === "published" ? (
            <form action={retireVersion} className="form-stack">
              <input type="hidden" name="versionId" value={version.id} />
              <label>
                Retirement reason
                <input name="reason" required />
              </label>
              <button className="button secondary">
                Retire for future assignment
              </button>
            </form>
          ) : (
            <p>Retired: {version.retirement_reason}</p>
          )}
        </aside>
      </div>
    </main>
  );
}

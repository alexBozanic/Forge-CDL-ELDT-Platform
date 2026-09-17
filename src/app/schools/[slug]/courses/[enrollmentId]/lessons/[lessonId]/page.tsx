import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeMarkdown, markdownBlocks } from "@/components/safe-markdown";
import { requireUser } from "@/lib/auth";
import { LessonInteractions } from "./lesson-interactions";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; enrollmentId: string; lessonId: string }>;
}) {
  const { slug, enrollmentId, lessonId } = await params;
  const { supabase, user } = await requireUser();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, brand_primary_color, brand_accent_color")
    .eq("slug", slug)
    .single();
  if (!organization) notFound();
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, course_version_id")
    .eq("id", enrollmentId)
    .eq("organization_id", organization.id)
    .eq("student_user_id", user.id)
    .eq("status", "active")
    .single();
  if (!enrollment) notFound();
  const [lessonResult, manifestResult, progressResult] = await Promise.all([
    supabase
      .from("course_lessons")
      .select("id, title, body_markdown, estimated_minutes")
      .eq("id", lessonId)
      .eq("course_version_id", enrollment.course_version_id)
      .single(),
    supabase
      .from("course_version_manifest_lessons")
      .select("lesson_id, manifest_position")
      .eq("course_version_id", enrollment.course_version_id)
      .order("manifest_position"),
    supabase
      .from("lesson_progress")
      .select("status, resume_position, last_opened_at, completed_at")
      .eq("enrollment_id", enrollment.id)
      .eq("lesson_id", lessonId)
      .maybeSingle(),
  ]);
  // An unavailable read is not an empty progress record. Do not mount the
  // interaction controls (which record an open) with an unknown saved state.
  if (lessonResult.error || manifestResult.error || progressResult.error)
    throw new Error("Lesson information is temporarily unavailable.");
  const lesson = lessonResult.data;
  const manifest = manifestResult.data ?? [];
  const index = manifest.findIndex((item) => item.lesson_id === lessonId);
  if (!lesson || index < 0) notFound();
  const previous = manifest[index - 1]?.lesson_id;
  const next = manifest[index + 1]?.lesson_id;
  const positions = markdownBlocks(lesson.body_markdown).map(
    (_, position) => position,
  );
  return (
    <main
      className="container main branded-shell reader-shell"
      style={
        {
          "--school-primary": organization.brand_primary_color,
          "--school-accent": organization.brand_accent_color,
        } as React.CSSProperties
      }
      id="main-content"
    >
      <p className="kicker">
        {organization.name} · Lesson {index + 1} of {manifest.length}
      </p>
      <h1>{lesson.title}</h1>
      <p>
        {lesson.estimated_minutes} minute estimate ·{" "}
        {progressResult.data?.status ?? "not started"}
      </p>
      {progressResult.data?.resume_position ? (
        <div className="notice">
          <strong>Saved resume point</strong>
          <span>
            Continue near section {progressResult.data.resume_position + 1}.
            This position records navigation only.
          </span>
        </div>
      ) : null}
      <SafeMarkdown markdown={lesson.body_markdown} />
      <LessonInteractions
        key={`${enrollment.id}:${lesson.id}`}
        coursePath={`/schools/${slug}/courses/${enrollment.id}`}
        enrollmentId={enrollment.id}
        lessonId={lesson.id}
        positions={positions}
      />
      <nav className="lesson-nav" aria-label="Lesson navigation">
        {previous ? (
          <Link
            className="button secondary"
            href={`/schools/${slug}/courses/${enrollment.id}/lessons/${previous}`}
          >
            Previous lesson
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            className="button"
            href={`/schools/${slug}/courses/${enrollment.id}/lessons/${next}`}
          >
            Next lesson
          </Link>
        ) : (
          <Link
            className="button secondary"
            href={`/schools/${slug}/courses/${enrollment.id}`}
          >
            Course overview
          </Link>
        )}
      </nav>
    </main>
  );
}

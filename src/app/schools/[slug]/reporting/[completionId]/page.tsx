import { recordTime } from "@/lib/record-time";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth";

type Snapshot = Record<string, string | null>;
type Transcript = {
  completion: {
    id: string;
    completed_at: string;
    course_manifest_hash: string;
    qualifying_attempt_id: string;
    student_identity_snapshot: Snapshot;
    provider_snapshot: Snapshot;
  };
  course: {
    version_id: string;
    title: string;
    version_number: number;
    published_at: string;
  };
  lessons: Array<{
    lesson_id: string;
    title: string;
    manifest_position: number;
    content_hash: string;
    first_opened_at: string | null;
    last_opened_at: string | null;
    completed_at: string | null;
  }>;
  attempts: Array<{
    id: string;
    assessment_title: string;
    assessment_kind: string;
    attempt_number: number;
    status: string;
    passing_percent: number;
    score_percent: number | null;
    correct_count: number | null;
    question_count: number;
    started_at: string;
    expires_at: string;
    submitted_at: string | null;
    qualifying: boolean;
  }>;
  corrections: Array<{
    field_name: string;
    prior_value: string;
    corrected_value: string;
    reason: string;
    occurred_at: string;
  }>;
  reporting: {
    status: string;
    identity_snapshot: Snapshot;
    provider_snapshot: Snapshot;
    events: Array<{
      from_status: string | null;
      to_status: string;
      reason: string;
      occurred_at: string;
    }>;
  } | null;
};

function date(value: string | null) {
  return recordTime(value);
}

function fullName(identity: Snapshot) {
  return [
    identity.legal_first_name,
    identity.legal_middle_name,
    identity.legal_last_name,
  ]
    .filter(Boolean)
    .join(" ");
}

export default async function TrainingTranscriptPage({
  params,
}: {
  params: Promise<{ slug: string; completionId: string }>;
}) {
  const { slug, completionId } = await params;
  const { supabase, isPlatformAdministrator, memberships } =
    await getAuthorizationContext();
  const allowed =
    isPlatformAdministrator ||
    memberships.some((membership) => {
      const organization = Array.isArray(membership.organizations)
        ? membership.organizations[0]
        : membership.organizations;
      return (
        organization?.slug === slug &&
        membership.role === "school_admin" &&
        membership.status === "active"
      );
    });
  if (!allowed) notFound();

  const { data, error } = await supabase.rpc("get_training_transcript", {
    target_completion_id: completionId,
  });
  if (error || !data) notFound();
  const transcript = data as Transcript;
  const identity = transcript.completion.student_identity_snapshot;
  const provider = transcript.completion.provider_snapshot;

  return (
    <main className="container main transcript" id="main-content">
      <nav className="print-hidden" aria-label="Transcript actions">
        <Link href={`/schools/${slug}/reporting`}>← Reporting queue</Link>
        <p>
          Use your browser&apos;s print command to print or save this record.
        </p>
      </nav>
      <p className="kicker">Software training history</p>
      <h1>Training transcript</h1>
      <div className="notice">
        <strong>School record—not a certification</strong>
        <span>
          This printable history does not establish curriculum approval,
          provider eligibility, state eligibility, or external acceptance.
        </span>
      </div>

      <section className="panel">
        <h2>Completion snapshot</h2>
        <dl className="transcript-grid">
          <dt>Student</dt>
          <dd>{fullName(identity) || "Not recorded"}</dd>
          <dt>Date of birth</dt>
          <dd>{identity.date_of_birth ?? "Not recorded"}</dd>
          <dt>License or permit</dt>
          <dd>
            {identity.license_or_permit_number ?? "Not recorded"} ·{" "}
            {identity.issuing_jurisdiction ?? "jurisdiction not recorded"}
          </dd>
          <dt>Training provider</dt>
          <dd>{provider.name ?? "Not recorded"}</dd>
          <dt>Provider identifier</dt>
          <dd>{provider.provider_identifier ?? "Not recorded"}</dd>
          <dt>Course</dt>
          <dd>
            {transcript.course.title}, pinned version{" "}
            {transcript.course.version_number}
          </dd>
          <dt>Version ID</dt>
          <dd>
            <code>{transcript.course.version_id}</code>
          </dd>
          <dt>Manifest</dt>
          <dd>
            <code>{transcript.completion.course_manifest_hash}</code>
          </dd>
          <dt>Completed</dt>
          <dd>{date(transcript.completion.completed_at)}</dd>
        </dl>
      </section>

      <section className="panel">
        <h2>Lessons</h2>
        <ol>
          {transcript.lessons.map((lesson) => (
            <li key={lesson.lesson_id}>
              <strong>{lesson.title}</strong> — completed{" "}
              {date(lesson.completed_at)}
              <br />
              First opened {date(lesson.first_opened_at)}; last opened{" "}
              {date(lesson.last_opened_at)}
              <br />
              <small>
                Published content hash: <code>{lesson.content_hash}</code>
              </small>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <h2>Assessment attempts</h2>
        <table>
          <thead>
            <tr>
              <th>Assessment</th>
              <th>Attempt</th>
              <th>Status</th>
              <th>Score</th>
              <th>Started</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {transcript.attempts.map((attempt) => (
              <tr key={attempt.id}>
                <td>
                  {attempt.assessment_title}
                  {attempt.qualifying ? " (qualifying)" : ""}
                </td>
                <td>{attempt.attempt_number}</td>
                <td>{attempt.status}</td>
                <td>
                  {attempt.score_percent === null
                    ? "Pending"
                    : `${attempt.score_percent}% (${attempt.correct_count}/${attempt.question_count}); threshold ${attempt.passing_percent}%`}
                </td>
                <td>{date(attempt.started_at)}</td>
                <td>{date(attempt.submitted_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Append-only corrections and reporting history</h2>
        {transcript.corrections.length ? (
          <ul>
            {transcript.corrections.map((correction, index) => (
              <li key={`${correction.occurred_at}-${index}`}>
                {date(correction.occurred_at)} · {correction.field_name}:{" "}
                {correction.prior_value || "empty"} →{" "}
                {correction.corrected_value}. {correction.reason}
              </li>
            ))}
          </ul>
        ) : (
          <p>No completion corrections recorded.</p>
        )}
        {transcript.reporting ? (
          <>
            <p>
              Current reporting status:{" "}
              <strong>{transcript.reporting.status}</strong>
            </p>
            <ul>
              {transcript.reporting.events.map((event, index) => (
                <li key={`${event.occurred_at}-${index}`}>
                  {date(event.occurred_at)} · {event.from_status ?? "created"} →{" "}
                  {event.to_status}. {event.reason}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>No manual reporting record.</p>
        )}
      </section>
    </main>
  );
}

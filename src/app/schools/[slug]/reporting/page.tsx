import { recordTime } from "@/lib/record-time";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth";
import {
  prepareReporting,
  transitionReporting,
  updateReportingIdentifiers,
} from "./actions";
export default async function ReportingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, isPlatformAdministrator, memberships } =
    await getAuthorizationContext();
  const allowed =
    isPlatformAdministrator ||
    memberships.some((m) => {
      const o = Array.isArray(m.organizations)
        ? m.organizations[0]
        : m.organizations;
      return (
        o?.slug === slug && m.role === "school_admin" && m.status === "active"
      );
    });
  if (!allowed) notFound();
  const { data: org } = await supabase
    .from("organizations")
    .select("id,name,provider_identifier")
    .eq("slug", slug)
    .single();
  if (!org) notFound();
  const { data: records, error } = await supabase
    .from("reporting_records")
    .select(
      "id,status,created_at,readiness_issues,reporting_identity_snapshot,provider_snapshot,course_completions(id,student_user_id,completed_at,course_manifest_hash,course_version_id,assessment_attempts(score_percent,submitted_at)),reporting_events(id,from_status,to_status,reason,occurred_at)",
    )
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  // Completions have no direct foreign key to course_versions.
  // Resolve only versions referenced by this tenant's RLS-filtered records.
  const versionIds = [
    ...new Set(
      (records ?? []).flatMap((record) => {
        const completion = Array.isArray(record.course_completions)
          ? record.course_completions[0]
          : record.course_completions;
        return completion ? [completion.course_version_id] : [];
      }),
    ),
  ];
  const versions = new Map<string, { title: string; version_number: number }>();
  if (versionIds.length > 0) {
    const { data: courseVersions, error: versionsError } = await supabase
      .from("course_versions")
      .select("id,title,version_number")
      .in("id", versionIds);
    if (versionsError) throw versionsError;
    for (const version of courseVersions ?? []) {
      versions.set(version.id, version);
    }
  }
  return (
    <main className="container main" id="main-content">
      <nav className="inline-form" aria-label="Reporting navigation">
        <Link href={`/schools/${slug}`}>School workspace</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>
      <p className="kicker">{org.name} · Manual reporting</p>
      <h1>Completion and TPR work queue</h1>
      <div className="notice">
        <strong>No automatic FMCSA submission</strong>
        <span>
          Ready, submitted, and accepted are separate recorded states. A
          submission requires an administrator action, timestamp, and reason.
        </span>
      </div>
      <p>
        <Link
          className="button secondary"
          href={`/schools/${slug}/reporting/export`}
        >
          Download tenant-safe CSV
        </Link>
      </p>
      {records?.length ? (
        <div className="list-stack">
          {records.map((record) => {
            const completion = Array.isArray(record.course_completions)
              ? record.course_completions[0]
              : record.course_completions;
            const version = completion
              ? versions.get(completion.course_version_id)
              : undefined;
            return (
              <article className="panel reporting-record" key={record.id}>
                <h2>
                  {version?.title ?? "Pinned course"} · {record.status}
                </h2>
                <p>
                  Completed{" "}
                  {completion?.completed_at
                    ? recordTime(completion.completed_at)
                    : "unknown"}{" "}
                  · version {version?.version_number}
                </p>
                <p>
                  Manifest <code>{completion?.course_manifest_hash}</code>
                </p>
                <p>
                  <Link
                    href={`/schools/${slug}/students/${completion?.student_user_id}`}
                  >
                    View or edit student profile
                  </Link>
                </p>
                {record.status === "needs_attention" ? (
                  <>
                    <p>
                      Missing:{" "}
                      {(record.readiness_issues as string[]).join(", ")}
                    </p>
                    <form
                      action={updateReportingIdentifiers}
                      className="form-stack"
                    >
                      <input type="hidden" name="slug" value={slug} />
                      <input
                        type="hidden"
                        name="organizationId"
                        value={org.id}
                      />
                      <input
                        type="hidden"
                        name="studentUserId"
                        value={completion?.student_user_id}
                      />
                      <label>
                        Date of birth
                        <input name="dateOfBirth" type="date" required />
                      </label>
                      <label>
                        License or permit number
                        <input name="licenseNumber" required />
                      </label>
                      <label>
                        Issuing jurisdiction
                        <input
                          name="jurisdiction"
                          pattern="[A-Za-z]{2}"
                          maxLength={2}
                          required
                        />
                      </label>
                      <label>
                        Provider identifier
                        <input
                          name="providerIdentifier"
                          defaultValue={org.provider_identifier ?? ""}
                          required
                        />
                      </label>
                      <button className="button secondary">
                        Save required reporting fields
                      </button>
                    </form>
                    <form action={prepareReporting}>
                      <input type="hidden" name="slug" value={slug} />
                      <input
                        type="hidden"
                        name="reportingId"
                        value={record.id}
                      />
                      <button className="button">
                        Review fields and mark ready
                      </button>
                    </form>
                  </>
                ) : null}
                {record.status === "ready" ? (
                  <form action={transitionReporting} className="form-stack">
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="reportingId" value={record.id} />
                    <input type="hidden" name="status" value="submitted" />
                    <label>
                      Manual submission note
                      <input name="reason" required />
                    </label>
                    <button className="button">Record submitted</button>
                  </form>
                ) : null}
                {record.status === "submitted" ? (
                  <div className="inline-form">
                    <form action={transitionReporting}>
                      <input type="hidden" name="slug" value={slug} />
                      <input
                        type="hidden"
                        name="reportingId"
                        value={record.id}
                      />
                      <input type="hidden" name="status" value="accepted" />
                      <input
                        name="reason"
                        aria-label="Acceptance evidence note"
                        placeholder="Acceptance evidence note"
                        required
                      />
                      <button className="button">Record accepted</button>
                    </form>
                    <form action={transitionReporting}>
                      <input type="hidden" name="slug" value={slug} />
                      <input
                        type="hidden"
                        name="reportingId"
                        value={record.id}
                      />
                      <input type="hidden" name="status" value="rejected" />
                      <input
                        name="reason"
                        aria-label="Rejection details"
                        placeholder="Rejection details"
                        required
                      />
                      <button className="button secondary">
                        Record rejected
                      </button>
                    </form>
                  </div>
                ) : null}
                <details>
                  <summary>Append-only status history</summary>
                  <ul>
                    {record.reporting_events?.map((event) => (
                      <li key={event.id}>
                        {event.from_status ?? "created"} → {event.to_status} ·{" "}
                        {recordTime(event.occurred_at)} · {event.reason}
                      </li>
                    ))}
                  </ul>
                </details>
                <p>
                  <Link
                    className="button secondary"
                    href={`/schools/${slug}/reporting/${completion?.id}`}
                  >
                    View printable training transcript
                  </Link>
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No completion records</h2>
          <p>Passing partial work does not create reporting work.</p>
        </div>
      )}
    </main>
  );
}

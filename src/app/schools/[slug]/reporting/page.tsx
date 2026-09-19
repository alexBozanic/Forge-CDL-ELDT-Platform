import {
  decodeReportingCursor,
  loadReportingQueue,
} from "@/lib/reporting-queue";
import { randomUUID } from "node:crypto";
import { MutationForm } from "@/components/mutation-form";
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ before?: string | string[] }>;
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
  let cursor;
  try {
    cursor = decodeReportingCursor((await searchParams).before);
  } catch {
    notFound();
  }
  const { records, versions, next } = await loadReportingQueue(
    supabase,
    org.id,
    cursor,
  );
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
      <p>
        CSV downloads support up to 10,000 records. If the export cannot be
        completed, an error appears instead of a partial file.
      </p>
      <p>Newest records first; up to 50 per page.</p>
      <nav className="inline-form" aria-label="Reporting pages">
        {cursor ? (
          <Link href={`/schools/${slug}/reporting`}>Newest records</Link>
        ) : null}
        {next ? (
          <Link href={`/schools/${slug}/reporting?before=${next}`}>
            Older records
          </Link>
        ) : null}
      </nav>
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
                    <MutationForm
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
                    </MutationForm>
                    <MutationForm
                      action={prepareReporting.bind(null, randomUUID())}
                    >
                      <input type="hidden" name="slug" value={slug} />
                      <input
                        type="hidden"
                        name="reportingId"
                        value={record.id}
                      />
                      <button className="button">
                        Review fields and mark ready
                      </button>
                    </MutationForm>
                  </>
                ) : null}
                {record.status === "ready" ? (
                  <MutationForm
                    action={transitionReporting.bind(null, randomUUID())}
                    className="form-stack"
                  >
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="reportingId" value={record.id} />
                    <input type="hidden" name="status" value="submitted" />
                    <label>
                      Manual submission note
                      <input name="reason" required />
                    </label>
                    <button className="button">Record submitted</button>
                  </MutationForm>
                ) : null}
                {record.status === "submitted" ? (
                  <div className="inline-form">
                    <MutationForm
                      action={transitionReporting.bind(null, randomUUID())}
                    >
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
                    </MutationForm>
                    <MutationForm
                      action={transitionReporting.bind(null, randomUUID())}
                    >
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
                    </MutationForm>
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
          <h2>{cursor ? "No older records" : "No completion records"}</h2>
          <p>
            {cursor
              ? "You have reached the end of this queue."
              : "Passing partial work does not create reporting work."}
          </p>
        </div>
      )}
    </main>
  );
}

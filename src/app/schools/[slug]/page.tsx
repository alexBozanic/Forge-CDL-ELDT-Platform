import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth";
import { InvitationForm } from "./invitation-form";
import {
  createAssignment,
  revokeInvitation,
  updateSchoolSettings,
  withdrawAssignment,
} from "./actions";

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, user, isPlatformAdministrator, memberships } =
    await getAuthorizationContext();
  const membership = memberships.find((item) => {
    const org = Array.isArray(item.organizations)
      ? item.organizations[0]
      : item.organizations;
    return org?.slug === slug && item.status === "active";
  });
  if (!membership && !isPlatformAdministrator) notFound();
  const { data: organization, error } = await supabase
    .from("organizations")
    .select(
      "id, slug, name, contact_email, brand_primary_color, brand_accent_color, is_demo",
    )
    .eq("slug", slug)
    .single();
  if (error || !organization) notFound();
  const isAdministrator =
    isPlatformAdministrator || membership?.role === "school_admin";

  if (!isAdministrator) {
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, status, course_version_id, course_assignments(title)")
      .eq("organization_id", organization.id)
      .eq("student_user_id", user.id);
    if (enrollmentError) throw enrollmentError;
    return (
      <main
        className="container main branded-shell"
        style={
          {
            "--school-primary": organization.brand_primary_color,
            "--school-accent": organization.brand_accent_color,
          } as React.CSSProperties
        }
        id="main-content"
      >
        <nav aria-label="School navigation">
          <Link href="/dashboard">Dashboard</Link>
        </nav>
        <p className="kicker">Student workspace · Demonstration only</p>
        <h1>{organization.name}</h1>
        <p>
          <Link href={`/schools/${slug}/profile`}>
            Complete or update your student profile
          </Link>
        </p>
        <section>
          <h2>Your assignments</h2>
          {enrollments?.length ? (
            <div className="list-stack">
              {enrollments.map((enrollment) => {
                const assignment = Array.isArray(enrollment.course_assignments)
                  ? enrollment.course_assignments[0]
                  : enrollment.course_assignments;
                return (
                  <article className="gate" key={enrollment.id}>
                    <h3>
                      <Link href={`/schools/${slug}/courses/${enrollment.id}`}>
                        {assignment?.title ?? "Assignment"}
                      </Link>
                    </h3>
                    <p>Status: {enrollment.status}</p>
                    <p>Version pinned: {enrollment.course_version_id}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No assignment yet</h3>
              <p>Your school has not assigned demonstration content.</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  const [
    membersResult,
    profilesResult,
    assignmentsResult,
    invitationsResult,
    versionsResult,
  ] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select("user_id, role, status")
      .eq("organization_id", organization.id)
      .eq("role", "student")
      .order("created_at"),
    supabase
      .from("student_profiles")
      .select("user_id, legal_first_name, legal_last_name")
      .eq("organization_id", organization.id),
    supabase
      .from("course_assignments")
      .select("id, title, active, course_version_id")
      .eq("organization_id", organization.id),
    supabase
      .from("invitations")
      .select("id, email, status, expires_at, assignment_id")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("course_versions")
      .select("id, title, version_number, status, courses(is_demo)")
      .eq("status", "published")
      .order("title"),
  ]);
  for (const result of [
    membersResult,
    profilesResult,
    assignmentsResult,
    invitationsResult,
    versionsResult,
  ])
    if (result.error) throw result.error;
  const profiles = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.user_id, profile]),
  );
  return (
    <main
      className="container main branded-shell"
      style={
        {
          "--school-primary": organization.brand_primary_color,
          "--school-accent": organization.brand_accent_color,
        } as React.CSSProperties
      }
      id="main-content"
    >
      <nav aria-label="School navigation">
        <Link href="/dashboard">Dashboard</Link>
      </nav>
      <p className="kicker">School administration · Demonstration only</p>
      <h1>{organization.name}</h1>
      <p>
        <Link className="button secondary" href={`/schools/${slug}/reporting`}>
          Completion and manual reporting queue
        </Link>
      </p>
      <div className="admin-grid">
        <section className="panel">
          <h2>Students</h2>
          {membersResult.data?.length ? (
            <div className="list-stack">
              {membersResult.data.map((member) => {
                const profile = profiles.get(member.user_id);
                return (
                  <Link
                    className="list-row"
                    href={`/schools/${slug}/students/${member.user_id}`}
                    key={member.user_id}
                  >
                    <strong>
                      {profile
                        ? `${profile.legal_first_name} ${profile.legal_last_name}`
                        : "Profile pending"}
                    </strong>
                    <span>{member.status}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No students</h3>
              <p>Create an invitation to begin.</p>
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Invite a student</h2>
          <InvitationForm
            organizationId={organization.id}
            slug={slug}
            assignments={(assignmentsResult.data ?? []).filter(
              (assignment) => assignment.active,
            )}
          />
        </section>
        <section className="panel">
          <h2>Course assignments</h2>
          <p>
            Choose an existing published version. School administrators cannot
            edit master curriculum.
          </p>
          <form action={createAssignment} className="form-stack">
            <input
              type="hidden"
              name="organizationId"
              value={organization.id}
            />
            <input type="hidden" name="slug" value={slug} />
            <label>
              Assignment name
              <input name="title" required />
            </label>
            <label>
              Published version
              <select name="courseVersionId" required>
                {versionsResult.data
                  ?.filter((version) => {
                    const course = Array.isArray(version.courses)
                      ? version.courses[0]
                      : version.courses;
                    return organization.is_demo || !course?.is_demo;
                  })
                  .map((version) => {
                    const course = Array.isArray(version.courses)
                      ? version.courses[0]
                      : version.courses;
                    return (
                      <option key={version.id} value={version.id}>
                        {version.title} · version {version.version_number}
                        {course?.is_demo ? " · demo" : ""}
                      </option>
                    );
                  })}
              </select>
            </label>
            <button className="button">Create assignment</button>
          </form>
          <div className="list-stack assignment-list">
            {assignmentsResult.data?.map((assignment) => (
              <div className="list-row" key={assignment.id}>
                <span>{assignment.title}</span>
                <strong>{assignment.active ? "active" : "withdrawn"}</strong>
                {assignment.active ? (
                  <form action={withdrawAssignment} className="inline-form">
                    <input type="hidden" name="slug" value={slug} />
                    <input
                      type="hidden"
                      name="assignmentId"
                      value={assignment.id}
                    />
                    <input
                      name="reason"
                      aria-label="Withdrawal reason"
                      placeholder="Reason"
                      required
                    />
                    <button className="text-button">Withdraw</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Invitation history</h2>
          {invitationsResult.data?.length ? (
            <div className="list-stack">
              {invitationsResult.data.map((invitation) => (
                <div className="list-row" key={invitation.id}>
                  <span>{invitation.email}</span>
                  <strong>{invitation.status}</strong>
                  {invitation.status === "pending" ? (
                    <form action={revokeInvitation}>
                      <input
                        type="hidden"
                        name="invitationId"
                        value={invitation.id}
                      />
                      <input type="hidden" name="slug" value={slug} />
                      <button className="text-button" type="submit">
                        Revoke
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p>No invitations yet.</p>
          )}
        </section>
        <section className="panel">
          <h2>School settings</h2>
          <form action={updateSchoolSettings} className="form-stack">
            <input
              type="hidden"
              name="organizationId"
              value={organization.id}
            />
            <input type="hidden" name="slug" value={slug} />
            <label>
              Name
              <input name="name" defaultValue={organization.name} required />
            </label>
            <label>
              Contact email
              <input
                name="email"
                type="email"
                defaultValue={organization.contact_email ?? ""}
              />
            </label>
            <label>
              Primary color
              <input
                name="primaryColor"
                defaultValue={organization.brand_primary_color}
                pattern="#[0-9A-Fa-f]{6}"
                required
              />
            </label>
            <label>
              Accent color
              <input
                name="accentColor"
                defaultValue={organization.brand_accent_color}
                pattern="#[0-9A-Fa-f]{6}"
                required
              />
            </label>
            <button className="button" type="submit">
              Save settings
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

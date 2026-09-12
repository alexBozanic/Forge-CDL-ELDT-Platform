import Link from "next/link";
import { getAuthorizationContext } from "@/lib/auth";
import { logout } from "../login/actions";

export default async function DashboardPage() {
  const { user, isPlatformAdministrator, memberships } =
    await getAuthorizationContext();
  const activeMemberships = memberships.filter(
    (item) => item.status === "active",
  );

  return (
    <main className="container main" id="main-content">
      <div className="page-heading">
        <div>
          <p className="kicker">Authenticated workspace</p>
          <h1>Choose your workspace</h1>
          <p>{user.email}</p>
        </div>
        <form action={logout}>
          <button className="button secondary" type="submit">
            Sign out
          </button>
        </form>
      </div>
      <div className="card-grid">
        {isPlatformAdministrator ? (
          <>
            <Link className="gate interactive-card" href="/platform/schools">
              <h2>Platform administration</h2>
              <p>Create and review demonstration schools.</p>
            </Link>
            <Link className="gate interactive-card" href="/platform/courses">
              <h2>Course authoring</h2>
              <p>Build, review, preview, and publish immutable versions.</p>
            </Link>
          </>
        ) : null}
        {activeMemberships.map((membership) => {
          const organization = Array.isArray(membership.organizations)
            ? membership.organizations[0]
            : membership.organizations;
          return organization ? (
            <Link
              className="gate interactive-card"
              href={`/schools/${organization.slug}`}
              key={membership.organization_id}
            >
              <h2>{organization.name}</h2>
              <p>
                {membership.role === "school_admin"
                  ? "School administration"
                  : "Student learning workspace"}
              </p>
            </Link>
          ) : null;
        })}
      </div>
      {!isPlatformAdministrator && activeMemberships.length === 0 ? (
        <div className="notice">
          <strong>No active school access</strong>
          <span>
            Ask a school administrator for an invitation, or enter an invitation
            after signing in.
          </span>
          <Link href="/invitations/accept">Accept an invitation</Link>
        </div>
      ) : null}
    </main>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthorizationContext } from "@/lib/auth";
import { createSchool } from "./actions";

export default async function SchoolsPage() {
  const { supabase, isPlatformAdministrator } = await getAuthorizationContext();
  if (!isPlatformAdministrator) notFound();
  const { data: schools, error } = await supabase
    .from("organizations")
    .select("id, name, slug, status, contact_email")
    .order("name");
  if (error) throw error;
  return (
    <main className="container main" id="main-content">
      <div className="page-heading">
        <div>
          <p className="kicker">Platform administration</p>
          <h1>Demonstration schools</h1>
        </div>
      </div>
      <div className="two-column">
        <section className="panel">
          <h2>Create a school</h2>
          <form action={createSchool} className="form-stack">
            <label>
              Name
              <input name="name" required maxLength={160} />
            </label>
            <label>
              Slug
              <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
            </label>
            <label>
              Contact email
              <input name="email" type="email" />
            </label>
            <button className="button" type="submit">
              Create school
            </button>
          </form>
        </section>
        <section>
          <h2>Schools</h2>
          {schools?.length ? (
            <div className="list-stack">
              {schools.map((school) => (
                <Link
                  className="gate interactive-card"
                  href={`/schools/${school.slug}`}
                  key={school.id}
                >
                  <h3>{school.name}</h3>
                  <p>
                    {school.slug} · {school.status}
                  </p>
                  <p>{school.contact_email ?? "No contact email"}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No schools yet</h3>
              <p>Create the first demonstration school.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

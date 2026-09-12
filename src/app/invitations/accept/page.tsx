import { requireUser } from "@/lib/auth";
import { acceptInvitation } from "./actions";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await requireUser();
  const { error } = await searchParams;
  return (
    <main className="container main auth-shell" id="main-content">
      <section className="panel narrow-panel">
        <p className="kicker">Student invitation</p>
        <h1>Join your school</h1>
        <p>
          Signed in as <strong>{user.email}</strong>. The invitation must match
          this verified account email.
        </p>
        {error ? (
          <p className="form-error">
            This invitation is invalid, expired, revoked, already used, or
            belongs to another email.
          </p>
        ) : null}
        <form action={acceptInvitation} className="form-stack">
          <label>
            Invitation token
            <input name="token" required autoComplete="off" />
          </label>
          <button className="button" type="submit">
            Accept invitation
          </button>
        </form>
      </section>
    </main>
  );
}

import { requireUser } from "@/lib/auth";
import { updatePassword } from "./actions";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await requireUser();
  const { error } = await searchParams;
  return (
    <main className="container main auth-shell" id="main-content">
      <section className="panel narrow-panel">
        <p className="kicker">Secure account</p>
        <h1>Choose a new password</h1>
        <p>Updating password for {user.email}.</p>
        {error ? (
          <p className="form-error">
            The password could not be updated. Use at least 12 characters and
            try again.
          </p>
        ) : null}
        <form action={updatePassword} className="form-stack">
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          <button className="button" type="submit">
            Update password
          </button>
        </form>
      </section>
    </main>
  );
}

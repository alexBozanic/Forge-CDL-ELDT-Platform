import { login } from "./actions";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="container main auth-shell" id="main-content">
      <section className="panel narrow-panel" aria-labelledby="login-title">
        <p className="kicker">Secure access</p>
        <h1 id="login-title">Sign in to Forge</h1>
        <p className="lede">
          Use a development or school-managed Supabase account.
        </p>
        {error ? (
          <p className="form-error">Email or password was not accepted.</p>
        ) : null}
        <form action={login} className="form-stack">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="button" type="submit">
            Sign in
          </button>
        </form>
        <p className="auth-links">
          <Link href="/signup">Create an account</Link>
          <Link href="/password/recover">Forgot password?</Link>
        </p>
      </section>
    </main>
  );
}

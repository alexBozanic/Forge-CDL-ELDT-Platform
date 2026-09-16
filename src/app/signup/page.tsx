import { MutationForm } from "@/components/mutation-form";
import { authTransportFailure } from "@/lib/auth-action";
import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  return (
    <main className="container main auth-shell" id="main-content">
      <section className="panel narrow-panel">
        <p className="kicker">Invitation onboarding</p>
        <h1>Create your account</h1>
        <p>
          Creating an account does not grant access to a school. After
          confirming your email, sign in and enter the token supplied by your
          school.
        </p>
        {sent ? (
          <div className="notice" role="status">
            <strong>Check the local test inbox</strong>
            <span>
              If signup can proceed, Supabase will send confirmation
              instructions. The same message is shown for existing accounts.
            </span>
          </div>
        ) : (
          <MutationForm
            failureMessage={authTransportFailure}
            pendingMessage="Processing request..."
            action={signup}
            className="form-stack"
          >
            {error ? (
              <p className="form-error">
                Use a password with at least 12 characters.
              </p>
            ) : null}
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </label>
            <button className="button" type="submit">
              Create account
            </button>
          </MutationForm>
        )}
        <p>
          <Link href="/login">Return to sign in</Link>
        </p>
      </section>
    </main>
  );
}

import { MutationForm } from "@/components/mutation-form";
import { authTransportFailure } from "@/lib/auth-action";
import Link from "next/link";
import { requestPasswordRecovery } from "./actions";

export default async function RecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  return (
    <main className="container main auth-shell" id="main-content">
      <section className="panel narrow-panel">
        <p className="kicker">Account recovery</p>
        <h1>Reset your password</h1>
        {sent ? (
          <div className="notice" role="status">
            <strong>Check the local test inbox</strong>
            <span>
              If the account exists, Supabase will send recovery instructions.
            </span>
          </div>
        ) : (
          <MutationForm
            failureMessage={authTransportFailure}
            pendingMessage="Processing request..."
            action={requestPasswordRecovery}
            className="form-stack"
          >
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <button className="button" type="submit">
              Send recovery instructions
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

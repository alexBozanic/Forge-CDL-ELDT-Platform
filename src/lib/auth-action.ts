import { readPassword } from "./password-input.ts";
export type AuthOperation =
  | "login"
  | "signup"
  | "recover"
  | "update"
  | "logout";
export type AuthState = { error?: string; complete?: boolean };
export const authTransportFailure =
  "We could not confirm the request. Check your current session or inbox before trying again. No automatic retry was made.";
const failures: Record<AuthOperation, string> = {
  login:
    "Sign-in could not be confirmed. Check your email and password, then try again.",
  signup: authTransportFailure,
  recover: authTransportFailure,
  update:
    "The password update could not be confirmed. Check your account before trying again.",
  logout:
    "Sign-out could not be confirmed. Do not assume this session is signed out. Try signing out again.",
};
export async function runAuthAction(
  operation: AuthOperation,
  form: FormData,
  call: (values: {
    email: string;
    password: string;
  }) => PromiseLike<{ error: unknown }>,
): Promise<AuthState> {
  const rawEmail = form.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const password = readPassword(form);
  if (
    ["login", "signup", "recover"].includes(operation) &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    return { error: "Enter a valid email address." };
  if (["login", "signup", "update"].includes(operation) && password === null)
    return { error: "Enter a password." };
  if (
    (operation === "signup" || operation === "update") &&
    password!.length < 12
  )
    return { error: "Use a password with at least 12 characters." };
  // Signup/recovery deliberately show the same conditional notice for every
  // provider outcome, including transport errors, to avoid account enumeration.
  const neutral = operation === "signup" || operation === "recover";
  try {
    const result = await call({ email, password: password ?? "" });
    if (neutral || !result.error) return { complete: true };
  } catch {
    if (neutral) return { complete: true };
  }
  return { error: failures[operation] };
}

export async function redeemInvitation(
  form: FormData,
  call: (token: string) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<AuthState> {
  const raw = form.get("token");
  const token = typeof raw === "string" ? raw.trim() : "";
  if (!token || token.length > 512)
    return { error: "Enter the invitation token supplied by your school." };
  try {
    const result = await call(token);
    if (!result.error && result.data) return { complete: true };
  } catch {
    // Acceptance may already have committed; inspect membership before repeating.
  }
  return {
    error:
      "Invitation acceptance could not be confirmed. Check your dashboard for school access first. Otherwise, check the token and verified account email with your school. No automatic retry was made.",
  };
}

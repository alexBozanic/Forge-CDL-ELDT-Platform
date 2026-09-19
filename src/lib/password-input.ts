// Passwords are opaque credentials. Do not trim, normalize, log, or echo them.
export function readPassword(form: FormData): string | null {
  const value = form.get("password");
  return typeof value === "string" && value.length > 0 ? value : null;
}

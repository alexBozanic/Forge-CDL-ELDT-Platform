// Records must display the same unambiguous instant in every server timezone.
export function recordTime(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`
    : "Not recorded";
}

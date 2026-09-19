// Keep untrusted spreadsheet cells as text, including formula markers hidden
// behind whitespace/control characters and full-width locale variants.
// CSV consumers differ: this is not a guarantee after editing/re-saving a file.
export function reportingCsvCell(value: unknown): string {
  let text = String(value ?? "");
  if (
    /^[\t\r\n]|^[\s\u0000-\u001f]*[=+\-@\uff1d\uff0b\uff0d\uff20]/u.test(text)
  )
    text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

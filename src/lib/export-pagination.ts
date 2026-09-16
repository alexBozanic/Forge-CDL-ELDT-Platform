export const exportPageSize = 200;
export const exportRowLimit = 10000;

// Continue even after a short page: the API may impose a smaller row limit.
// Return no partial data if any page fails or the cursor stops advancing.
export async function readExportPages<T extends { id: string }>(
  load: (
    after: string | null,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<
  | { rows: T[]; error?: never }
  | { error: "unavailable" | "too_large"; rows?: never }
> {
  const rows: T[] = [];
  let after: string | null = null;
  try {
    while (true) {
      const result = await load(after);
      if (result.error || !Array.isArray(result.data))
        return { error: "unavailable" };
      if (result.data.length === 0) return { rows };
      for (const row of result.data) {
        if (
          typeof row.id !== "string" ||
          !row.id ||
          (after !== null && row.id <= after)
        )
          return { error: "unavailable" };
        after = row.id;
        rows.push(row);
        if (rows.length > exportRowLimit) return { error: "too_large" };
      }
    }
  } catch {
    return { error: "unavailable" };
  }
}

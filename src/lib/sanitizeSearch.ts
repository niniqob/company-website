/**
 * Escapes special SQL wildcard characters for safe use in ILIKE queries.
 * Prevents potential SQL injection via wildcard manipulation.
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== "string") return "";
  
  // Escape SQL LIKE special characters: % _ \
  return query
    .replace(/\\/g, "\\\\")  // Escape backslashes first
    .replace(/%/g, "\\%")    // Escape percent signs
    .replace(/_/g, "\\_");   // Escape underscores
}

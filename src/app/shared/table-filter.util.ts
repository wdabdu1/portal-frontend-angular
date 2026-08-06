// Shared helper for Excel-style multi-column filtering: computes each
// column's available checklist options by applying every OTHER active
// filter first (but not its own), so picking a value in one column
// narrows what shows up in the others — matching Excel's AutoFilter.
export function columnOptions<T>(rows: T[], filters: Record<string, Set<string>>, column: keyof T, getValue: (row: T) => string): string[] {
  const filtered = rows.filter((row) =>
    Object.entries(filters).every(([col, selected]) => {
      if (col === column || selected.size === 0) return true;
      return selected.has(getValue(row));
    })
  );
  return [...new Set(filtered.map(getValue))].sort();
}

export function applyFilters<T>(rows: T[], filters: Record<string, Set<string>>, getValue: (row: T, col: string) => string): T[] {
  return rows.filter((row) =>
    Object.entries(filters).every(([col, selected]) => selected.size === 0 || selected.has(getValue(row, col)))
  );
}

import * as XLSX from 'xlsx';

// Generic Excel export — takes whatever columns/rows are currently
// visible (respects the user's own filter, sort, and column order,
// since callers pass in their already-processed getter output).
export function exportToExcel<T>(filename: string, columns: { label: string; key: keyof T | string }[], rows: T[]): void {
  const data = rows.map((row) => {
    const obj: Record<string, any> = {};
    for (const col of columns) {
      obj[col.label] = (row as any)[col.key] ?? '';
    }
    return obj;
  });
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

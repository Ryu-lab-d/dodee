// Simple client-side CSV download - no backend round trip needed since the data is
// already loaded on the page. UTF-8 BOM prefix keeps Thai text readable when opened
// directly in Excel. Commas/newlines inside cells are replaced with spaces rather than
// quoted, matching the minimal escaping this app has used for CSV export elsewhere.
export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | null | undefined>>) {
  const escape = (v: string | number | null | undefined) => String(v ?? '').replace(/[,\n\r]/g, ' ');
  const lines = [header, ...rows].map((row) => row.map(escape).join(','));
  const csv = lines.join('\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

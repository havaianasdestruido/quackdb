// Pure helpers (no DOM, no DuckDB) so they can be unit-tested in Node.
export const MAX_DISPLAY_ROWS = 1000;

/** Quote an SQL identifier: "my ""col""". */
export const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;

const quoteString = (s) => `'${String(s).replace(/'/g, "''")}'`;

const jsonReplacer = (_k, v) => (typeof v === 'bigint' ? bigintToJSON(v) : v);
const bigintToJSON = (v) =>
  v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v.toString();

/** Display text for a cell, or null for SQL NULL (the caller renders a localized label). */
export function formatCell(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  if (value instanceof Uint8Array) return '0x' + [...value].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (typeof value === 'object') {
    try {
      const plain = typeof value.toJSON === 'function' ? value.toJSON() : value;
      return JSON.stringify(plain, jsonReplacer);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Search every column of a table for `term` (case-insensitive, literal match). */
export function buildSearchSQL(table, columns, term, limit = 1000) {
  const pattern = quoteString('%' + term.replace(/[\\%_]/g, '\\$&') + '%');
  const where = columns.length
    ? columns.map((c) => `CAST(${quoteIdent(c)} AS VARCHAR) ILIKE ${pattern} ESCAPE '\\'`).join('\n   OR ')
    : 'FALSE';
  return `SELECT * FROM ${quoteIdent(table)}\nWHERE ${where}\nLIMIT ${limit};`;
}

const csvField = (text) => (/[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);

export function toCSV(names, rows) {
  const lines = [names.map((n) => csvField(String(n))).join(',')];
  for (const row of rows) lines.push(row.map((v) => csvField(formatCell(v) ?? '')).join(','));
  return lines.join('\r\n') + '\r\n';
}

export function toJSONRecords(names, rows) {
  const records = rows.map((row) => Object.fromEntries(names.map((n, i) => [n, row[i] ?? null])));
  return JSON.stringify(records, (k, v) => (v instanceof Date ? v.toISOString() : jsonReplacer(k, v)), 2);
}

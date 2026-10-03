// DuckDB-WASM wrapper. Everything runs in the browser; nothing is uploaded.
import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm';
import { quoteIdent } from './utils.js';

export class UnsupportedFormatError extends Error {}

export const SAMPLE_TABLE = 'sample_ducks';
export const SAMPLE_QUERY = `SELECT species, count(*) AS birds, round(avg(weight_kg), 2) AS avg_kg
FROM ${SAMPLE_TABLE}
GROUP BY species
ORDER BY birds DESC;`;

export async function createEngine() {
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
  // Cross-origin workers are not allowed, so wrap the CDN worker script in a same-origin Blob.
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }),
  );
  const worker = new Worker(workerUrl);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  const conn = await db.connect();
  return { db, conn };
}

const sqlString = (s) => `'${String(s).replace(/'/g, "''")}'`;

function uniqueName(file, taken) {
  let base = file.name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'table';
  if (/^\d/.test(base)) base = 't_' + base;
  const used = new Set(taken.map((n) => n.toLowerCase()));
  let name = base;
  for (let i = 2; used.has(name.toLowerCase()); i++) name = `${base}_${i}`;
  return name;
}

function readerFor(ext, path) {
  const p = sqlString(path);
  switch (ext) {
    case 'csv':
    case 'txt':
      return `read_csv_auto(${p})`;
    case 'tsv':
      return `read_csv_auto(${p}, delim='\t')`;
    case 'parquet':
      return `read_parquet(${p})`;
    case 'json':
      return `read_json_auto(${p})`;
    case 'jsonl':
    case 'ndjson':
      return `read_json_auto(${p}, format='newline_delimited')`;
    default:
      return null;
  }
}

/** Import a File as a new table. Returns the table name. */
export async function importFile(engine, file, existingNames) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const name = uniqueName(file, existingNames);
  const path = `upload_${name}.${ext}`;
  if (!readerFor(ext, path)) throw new UnsupportedFormatError(file.name);
  await engine.db.registerFileBuffer(path, new Uint8Array(await file.arrayBuffer()));
  try {
    await engine.conn.query(`CREATE TABLE ${quoteIdent(name)} AS SELECT * FROM ${readerFor(ext, path)}`);
  } finally {
    await engine.db.dropFile(path); // the table is materialized; free the buffer
  }
  return name;
}

export async function loadSample(engine) {
  await engine.conn.query(`
    CREATE OR REPLACE TABLE ${SAMPLE_TABLE} AS
    SELECT i AS id,
           ['Mallard','Pekin','Muscovy','Teal','Eider'][1 + i % 5] AS species,
           round(0.6 + ((i * 37) % 100) / 40.0, 2) AS weight_kg,
           DATE '2024-01-01' + CAST(i * 3 AS INTEGER) AS hatched
    FROM range(1, 61) t(i)`);
  return SAMPLE_TABLE;
}

export async function dropTable(engine, name) {
  await engine.conn.query(`DROP TABLE IF EXISTS ${quoteIdent(name)}`);
}

export async function listTables(engine) {
  const names = arrowToRows(
    await engine.conn.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'main' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    ),
  ).map((r) => r[0]);
  const out = [];
  for (const name of names) {
    const columns = arrowToRows(
      await engine.conn.query(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_schema = 'main' AND table_name = ${sqlString(name)} ORDER BY ordinal_position`,
      ),
    ).map(([n, type]) => ({ name: n, type }));
    const count = arrowToRows(await engine.conn.query(`SELECT count(*) FROM ${quoteIdent(name)}`))[0][0];
    out.push({ name, rows: Number(count), columns });
  }
  return out;
}

export async function runQuery(engine, sql) {
  const start = performance.now();
  const table = await engine.conn.query(sql);
  const elapsedMs = Math.round(performance.now() - start);
  const columns = table.schema.fields.map((f) => ({ name: f.name, type: String(f.type) }));
  return { table, columns, totalRows: table.numRows, elapsedMs };
}

/** Arrow table -> array of row arrays (optionally capped at `limit` rows). */
export function arrowToRows(table, limit = Infinity) {
  const n = Math.min(table.numRows, limit);
  const cols = table.schema.fields.map((_, i) => table.getChildAt(i));
  const rows = new Array(n);
  for (let r = 0; r < n; r++) rows[r] = cols.map((c) => c.get(r));
  return rows;
}

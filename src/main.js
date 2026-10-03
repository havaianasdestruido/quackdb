// UI wiring. Follows the plainhtml rules: native elements only, `hidden` for visibility,
// textContent/append for user data (never innerHTML), ids as the only hooks.
import { initI18n, setLocale, onLocaleChange, t, formatNumber, currentLocale } from './i18n.js';
import {
  createEngine,
  importFile,
  loadSample,
  dropTable,
  listTables,
  runQuery,
  arrowToRows,
  SAMPLE_QUERY,
  UnsupportedFormatError,
} from './db.js';
import { MAX_DISPLAY_ROWS, buildSearchSQL, formatCell, quoteIdent, toCSV, toJSONRecords } from './utils.js';

const $ = (id) => document.getElementById(id);
const PANELS = ['files-panel', 'tables-panel', 'search-panel', 'sql-panel', 'results-panel'];

const state = {
  engine: null,
  tables: [], // [{ name, rows, columns: [{ name, type }] }]
  result: null, // { table, columns, totalRows, elapsedMs, rows }
};

let lastStatus = null; // { key, params } so the status line can be re-translated
let lastError = null; // { key, params }
let errorField = null;

/* ---------- status & errors ---------- */

function say(key, params) {
  lastStatus = { key, params };
  $('status').textContent = t(key, params);
}

function clearError() {
  lastError = null;
  $('error').hidden = true;
  $('error-text').textContent = '';
  $('retry-btn').hidden = true;
  if (errorField) {
    errorField.removeAttribute('aria-invalid');
    errorField.removeAttribute('aria-describedby');
    errorField = null;
  }
}

/** Show an alert. `field` marks a form control as invalid and moves focus to it. */
function showError(key, params, { field = null, retry = false } = {}) {
  clearError();
  lastError = { key, params, field, retry };
  $('error-text').textContent = '⚠ ' + t(key, params);
  $('retry-btn').hidden = !retry;
  $('error').hidden = false;
  if (field) {
    errorField = field;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', 'error-text');
    field.focus();
  }
}

const messageOf = (e) => String(e?.message ?? e).replace(/^Error:\s*/, '');

/* ---------- ready / busy state ---------- */

function setReady(ready) {
  for (const id of PANELS) $(id).disabled = !ready;
  $('busy').hidden = ready;
}

/* ---------- tables ---------- */

async function refreshTables() {
  state.tables = await listTables(state.engine);
  renderTables();
}

function renderTables() {
  const has = state.tables.length > 0;
  $('tables-empty').hidden = has;
  $('tables-table').hidden = !has;

  const rows = state.tables.map((info) => {
    const tr = document.createElement('tr');

    const nameCell = document.createElement('th');
    nameCell.scope = 'row';
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = info.name;
    summary.setAttribute('aria-label', `${info.name} – ${t('tables.columns_of', { name: info.name })}`);
    const list = document.createElement('ul');
    for (const col of info.columns) {
      const li = document.createElement('li');
      const code = document.createElement('code');
      code.textContent = col.name;
      const small = document.createElement('small');
      small.textContent = ` ${col.type}`;
      li.append(code, small);
      list.append(li);
    }
    details.append(summary, list);
    nameCell.append(details);

    const rowsCell = document.createElement('td');
    rowsCell.textContent = formatNumber(info.rows);
    const colsCell = document.createElement('td');
    colsCell.textContent = formatNumber(info.columns.length);

    const actions = document.createElement('td');
    const preview = document.createElement('button');
    preview.type = 'button';
    preview.textContent = t('tables.preview');
    preview.setAttribute('aria-label', t('tables.preview_aria', { name: info.name }));
    preview.addEventListener('click', () => {
      $('search-table').value = info.name;
      $('sql-input').value = `SELECT * FROM ${quoteIdent(info.name)} LIMIT 100;`;
      execute($('sql-input').value);
    });
    const drop = document.createElement('button');
    drop.type = 'button';
    drop.textContent = t('tables.drop');
    drop.setAttribute('aria-label', t('tables.drop_aria', { name: info.name }));
    drop.addEventListener('click', () => removeTable(info.name));
    actions.append(preview, ' ', drop);

    tr.append(nameCell, rowsCell, colsCell, actions);
    return tr;
  });
  $('tables-body').replaceChildren(...rows);

  // Search table picker keeps its selection when possible.
  const select = $('search-table');
  const previous = select.value;
  select.replaceChildren(
    ...state.tables.map((info) => {
      const option = document.createElement('option');
      option.value = info.name;
      option.textContent = info.name;
      return option;
    }),
  );
  if (state.tables.some((x) => x.name === previous)) select.value = previous;
}

async function removeTable(name) {
  clearError();
  try {
    await dropTable(state.engine, name);
    await refreshTables();
    say('status.dropped', { name });
    $('tables-legend').focus(); // the clicked button no longer exists
  } catch (e) {
    showError('error.query', { message: messageOf(e) });
  }
}

/* ---------- import ---------- */

async function importFiles(fileList) {
  const files = [...fileList];
  if (!state.engine || files.length === 0) return;
  clearError();

  let lastTable = null;
  for (const file of files) {
    say('status.importing', { name: file.name });
    try {
      lastTable = await importFile(
        state.engine,
        file,
        state.tables.map((x) => x.name),
      );
      await refreshTables();
      say('status.imported', { name: file.name, table: lastTable });
    } catch (e) {
      if (e instanceof UnsupportedFormatError) showError('error.unsupported', { name: file.name });
      else showError('error.import', { name: file.name, message: messageOf(e) });
    }
  }
  $('file-input').value = '';

  if (lastTable) {
    $('search-table').value = lastTable;
    $('sql-input').value = `SELECT * FROM ${quoteIdent(lastTable)} LIMIT 100;`;
    await execute($('sql-input').value, { keepError: true });
  }
}

async function useSample() {
  clearError();
  try {
    const name = await loadSample(state.engine);
    await refreshTables();
    say('status.sample_loaded', { name });
    $('search-table').value = name;
    $('sql-input').value = SAMPLE_QUERY;
    await execute(SAMPLE_QUERY, { keepError: true });
  } catch (e) {
    showError('error.query', { message: messageOf(e) });
  }
}

/* ---------- queries & results ---------- */

const CHANGES_SCHEMA = /\b(create|drop|alter|attach|detach|insert|delete|update|copy|import)\b/i;

async function execute(sql, { keepError = false } = {}) {
  if (!state.engine) return;
  if (!keepError) clearError();
  say('status.running');
  try {
    const result = await runQuery(state.engine, sql);
    result.rows = arrowToRows(result.table, MAX_DISPLAY_ROWS);
    state.result = result;
    renderResult();
    announceResult();
    if (CHANGES_SCHEMA.test(sql)) await refreshTables();
  } catch (e) {
    showError('error.query', { message: messageOf(e) });
  }
}

function summaryText() {
  const r = state.result;
  return r.totalRows === 0
    ? t('results.no_rows')
    : t('results.summary', { count: r.totalRows, ms: formatNumber(r.elapsedMs) });
}

function announceResult() {
  $('status').textContent = summaryText();
  lastStatus = { custom: true };
}

function renderResult() {
  const r = state.result;
  const has = r !== null;
  $('results-empty').hidden = has;
  $('results-summary').hidden = !has;
  $('results-table').hidden = !has || r.columns.length === 0;
  $('export-csv-btn').disabled = !has || r.columns.length === 0;
  $('export-json-btn').disabled = !has || r.columns.length === 0;
  if (!has) {
    $('results-note').hidden = true;
    return;
  }

  $('results-summary').textContent = summaryText();

  const headRow = document.createElement('tr');
  for (const col of r.columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    const small = document.createElement('small');
    small.textContent = col.type;
    th.append(col.name, document.createElement('br'), small);
    headRow.append(th);
  }
  $('results-head').replaceChildren(headRow);

  const nullLabel = t('results.null');
  const bodyRows = r.rows.map((row) => {
    const tr = document.createElement('tr');
    for (const value of row) {
      const td = document.createElement('td');
      const text = formatCell(value);
      if (text === null) {
        const em = document.createElement('em');
        em.textContent = nullLabel;
        td.append(em);
      } else {
        td.textContent = text;
      }
      tr.append(td);
    }
    return tr;
  });
  $('results-body').replaceChildren(...bodyRows);

  const truncated = r.totalRows > r.rows.length;
  $('results-note').hidden = !truncated;
  if (truncated) {
    $('results-note').textContent = t('results.truncated', {
      shown: formatNumber(r.rows.length),
      total: formatNumber(r.totalRows),
    });
  }
}

/* ---------- search ---------- */

async function search() {
  const tableName = $('search-table').value;
  if (!tableName) return showError('error.no_table', {}, { field: $('search-table') });
  const term = $('search-term').value.trim();
  if (!term) return showError('error.search_empty', {}, { field: $('search-term') });

  const info = state.tables.find((x) => x.name === tableName);
  const sql = buildSearchSQL(
    tableName,
    info.columns.map((c) => c.name),
    term,
  );
  $('sql-input').value = sql;
  await execute(sql);
}

/* ---------- export ---------- */

function download(fileName, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  say('status.exported', { file: fileName });
}

function exportResult(kind) {
  const r = state.result;
  if (!r) return;
  const names = r.columns.map((c) => c.name);
  const rows = arrowToRows(r.table); // every row, not just the displayed page
  if (kind === 'csv') download('results.csv', '\uFEFF' + toCSV(names, rows), 'text/csv;charset=utf-8');
  else download('results.json', toJSONRecords(names, rows), 'application/json');
}

/* ---------- events ---------- */

function wireEvents() {
  $('lang-select').addEventListener('change', (e) => setLocale(e.target.value));
  $('file-input').addEventListener('change', (e) => importFiles(e.target.files));
  $('sample-btn').addEventListener('click', useSample);
  $('search-btn').addEventListener('click', search);
  $('search-term').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search();
    }
  });
  $('search-term').addEventListener('input', () => {
    if (errorField === $('search-term')) clearError();
  });
  $('run-btn').addEventListener('click', () => execute($('sql-input').value));
  $('sql-input').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      execute($('sql-input').value);
    }
  });
  $('clear-btn').addEventListener('click', () => {
    $('sql-input').value = '';
    $('sql-input').focus();
  });
  $('export-csv-btn').addEventListener('click', () => exportResult('csv'));
  $('export-json-btn').addEventListener('click', () => exportResult('json'));
  $('retry-btn').addEventListener('click', start);

  // Drag and drop is a convenience; the file input above is the keyboard-accessible equivalent.
  const zone = $('files-panel');
  const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
  zone.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    $('drop-hint').hidden = false;
  });
  zone.addEventListener('dragleave', (e) => {
    if (!zone.contains(e.relatedTarget)) $('drop-hint').hidden = true;
  });
  zone.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    $('drop-hint').hidden = true;
    importFiles(e.dataTransfer.files);
  });
  // A file dropped outside the zone should not navigate away from the app.
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  onLocaleChange(() => {
    $('lang-select').value = currentLocale();
    renderTables();
    if (state.result) renderResult();
    if (lastStatus?.key) $('status').textContent = t(lastStatus.key, lastStatus.params);
    else if (lastStatus?.custom && state.result) $('status').textContent = summaryText();
    if (lastError) {
      $('error-text').textContent = '⚠ ' + t(lastError.key, lastError.params);
    }
  });
}

/* ---------- boot ---------- */

async function start() {
  clearError();
  setReady(false);
  say('status.loading');
  try {
    state.engine = await createEngine();
    await refreshTables();
    setReady(true);
    say('status.ready');
  } catch (e) {
    console.error(e);
    $('busy').hidden = true;
    showError('error.engine', {}, { retry: true });
  }
}

await initI18n();
$('lang-select').value = currentLocale();
wireEvents();
await start();

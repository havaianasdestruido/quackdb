// Tiny i18n: dictionaries in code, static text mapped by element id (no data-* scaffolding).
const KEY = 'quackdb-locale';
const LOCALES = ['en', 'pt-BR', 'es'];
let locale = 'en';
const listeners = [];

const en = {
  'page-title': 'DuckDB Explorer', 'app-title': 'DuckDB Explorer',
  'app-tagline': 'Load CSV, Parquet or JSON files and explore them with SQL, entirely in your browser. Your data never leaves this device.',
  'skip-link': 'Skip to main content', 'lang-label': 'Language',
  'files-legend': 'Add files',
  'files-help': 'Supported: CSV, TSV, Parquet, JSON and NDJSON. You can also drop files anywhere in this section.',
  'file-label': 'Choose data files', 'sample-btn-label': 'Load sample data', 'drop-hint': 'Drop files to import them',
  'tables-legend': 'Tables', 'tables-empty': 'No tables yet. Add a file or load the sample data.',
  'tables-caption': 'Loaded tables', 'th-table': 'Table', 'th-rows': 'Rows', 'th-columns': 'Columns', 'th-actions': 'Actions',
  'search-legend': 'Search', 'search-table-label': 'Table', 'search-term-label': 'Find text in any column', 'search-btn': 'Search',
  'sql-legend': 'SQL query', 'sql-label': 'SQL (DuckDB dialect)', 'sql-hint': 'Shortcut: Ctrl+Enter (Command+Enter on Mac)',
  'run-btn-label': 'Run query', 'clear-btn-label': 'Clear',
  'results-legend': 'Results', 'results-empty': 'Run a query to see results here.',
  'results-caption': 'Query results', 'export-csv-label': 'Export CSV', 'export-json-label': 'Export JSON',
  'retry-btn': 'Try again',
  'footer-privacy': 'Everything runs in your browser. Nothing is uploaded.', 'footer-credit': 'Powered by DuckDB-WASM.',
  'status.loading': 'Loading the DuckDB engine…', 'status.ready': 'Ready. Add a file or write a query.',
  'status.importing': 'Importing {name}…', 'status.imported': 'Imported {name} as table {table}.',
  'status.sample_loaded': 'Sample table {name} loaded.', 'status.dropped': 'Table {name} removed.',
  'status.running': 'Running query…', 'status.exported': 'Exported {file}.',
  'error.engine': 'The DuckDB engine could not be loaded. Check your connection and try again.',
  'error.query': 'Query failed: {message}', 'error.unsupported': '{name} is not a supported file type.',
  'error.import': 'Could not import {name}: {message}',
  'error.no_table': 'Choose a table to search.', 'error.search_empty': 'Type the text to search for.',
  'tables.columns_of': 'show columns of {name}', 'tables.preview': 'Preview', 'tables.preview_aria': 'Preview table {name}',
  'tables.drop': 'Drop', 'tables.drop_aria': 'Drop table {name}',
  'results.no_rows': 'The query returned no rows.', 'results.null': 'NULL',
  'results.summary.one': '{count} row in {ms} ms.', 'results.summary.other': '{count} rows in {ms} ms.',
  'results.truncated': 'Showing the first {shown} of {total} rows. Exports include all rows.',
};

const ptBR = {
  'page-title': 'Explorador DuckDB', 'app-title': 'Explorador DuckDB',
  'app-tagline': 'Carregue arquivos CSV, Parquet ou JSON e explore com SQL, inteiramente no navegador. Seus dados nunca saem deste dispositivo.',
  'skip-link': 'Ir para o conteúdo principal', 'lang-label': 'Idioma',
  'files-legend': 'Adicionar arquivos',
  'files-help': 'Aceitos: CSV, TSV, Parquet, JSON e NDJSON. Você também pode soltar arquivos em qualquer lugar desta seção.',
  'file-label': 'Escolher arquivos de dados', 'sample-btn-label': 'Carregar dados de exemplo', 'drop-hint': 'Solte os arquivos para importar',
  'tables-legend': 'Tabelas', 'tables-empty': 'Nenhuma tabela ainda. Adicione um arquivo ou carregue os dados de exemplo.',
  'tables-caption': 'Tabelas carregadas', 'th-table': 'Tabela', 'th-rows': 'Linhas', 'th-columns': 'Colunas', 'th-actions': 'Ações',
  'search-legend': 'Busca', 'search-table-label': 'Tabela', 'search-term-label': 'Buscar texto em qualquer coluna', 'search-btn': 'Buscar',
  'sql-legend': 'Consulta SQL', 'sql-label': 'SQL (dialeto DuckDB)', 'sql-hint': 'Atalho: Ctrl+Enter (Command+Enter no Mac)',
  'run-btn-label': 'Executar consulta', 'clear-btn-label': 'Limpar',
  'results-legend': 'Resultados', 'results-empty': 'Execute uma consulta para ver os resultados aqui.',
  'results-caption': 'Resultados da consulta', 'export-csv-label': 'Exportar CSV', 'export-json-label': 'Exportar JSON',
  'retry-btn': 'Tentar novamente',
  'footer-privacy': 'Tudo roda no seu navegador. Nada é enviado.', 'footer-credit': 'Feito com DuckDB-WASM.',
  'status.loading': 'Carregando o motor DuckDB…', 'status.ready': 'Pronto. Adicione um arquivo ou escreva uma consulta.',
  'status.importing': 'Importando {name}…', 'status.imported': '{name} importado como tabela {table}.',
  'status.sample_loaded': 'Tabela de exemplo {name} carregada.', 'status.dropped': 'Tabela {name} removida.',
  'status.running': 'Executando consulta…', 'status.exported': '{file} exportado.',
  'error.engine': 'Não foi possível carregar o motor DuckDB. Verifique a conexão e tente novamente.',
  'error.query': 'A consulta falhou: {message}', 'error.unsupported': '{name} não é um tipo de arquivo compatível.',
  'error.import': 'Não foi possível importar {name}: {message}',
  'error.no_table': 'Escolha uma tabela para buscar.', 'error.search_empty': 'Digite o texto a buscar.',
  'tables.columns_of': 'mostrar colunas de {name}', 'tables.preview': 'Visualizar', 'tables.preview_aria': 'Visualizar tabela {name}',
  'tables.drop': 'Excluir', 'tables.drop_aria': 'Excluir tabela {name}',
  'results.no_rows': 'A consulta não retornou linhas.', 'results.null': 'NULO',
  'results.summary.one': '{count} linha em {ms} ms.', 'results.summary.other': '{count} linhas em {ms} ms.',
  'results.truncated': 'Mostrando as primeiras {shown} de {total} linhas. As exportações incluem todas as linhas.',
};

const es = {
  'page-title': 'Explorador DuckDB', 'app-title': 'Explorador DuckDB',
  'app-tagline': 'Carga archivos CSV, Parquet o JSON y explóralos con SQL, íntegramente en tu navegador. Tus datos nunca salen de este dispositivo.',
  'skip-link': 'Saltar al contenido principal', 'lang-label': 'Idioma',
  'files-legend': 'Añadir archivos',
  'files-help': 'Compatibles: CSV, TSV, Parquet, JSON y NDJSON. También puedes soltar archivos en cualquier punto de esta sección.',
  'file-label': 'Elegir archivos de datos', 'sample-btn-label': 'Cargar datos de ejemplo', 'drop-hint': 'Suelta los archivos para importarlos',
  'tables-legend': 'Tablas', 'tables-empty': 'Aún no hay tablas. Añade un archivo o carga los datos de ejemplo.',
  'tables-caption': 'Tablas cargadas', 'th-table': 'Tabla', 'th-rows': 'Filas', 'th-columns': 'Columnas', 'th-actions': 'Acciones',
  'search-legend': 'Búsqueda', 'search-table-label': 'Tabla', 'search-term-label': 'Buscar texto en cualquier columna', 'search-btn': 'Buscar',
  'sql-legend': 'Consulta SQL', 'sql-label': 'SQL (dialecto DuckDB)', 'sql-hint': 'Atajo: Ctrl+Enter (Command+Enter en Mac)',
  'run-btn-label': 'Ejecutar consulta', 'clear-btn-label': 'Borrar',
  'results-legend': 'Resultados', 'results-empty': 'Ejecuta una consulta para ver los resultados aquí.',
  'results-caption': 'Resultados de la consulta', 'export-csv-label': 'Exportar CSV', 'export-json-label': 'Exportar JSON',
  'retry-btn': 'Reintentar',
  'footer-privacy': 'Todo se ejecuta en tu navegador. No se sube nada.', 'footer-credit': 'Con tecnología DuckDB-WASM.',
  'status.loading': 'Cargando el motor DuckDB…', 'status.ready': 'Listo. Añade un archivo o escribe una consulta.',
  'status.importing': 'Importando {name}…', 'status.imported': '{name} importado como tabla {table}.',
  'status.sample_loaded': 'Tabla de ejemplo {name} cargada.', 'status.dropped': 'Tabla {name} eliminada.',
  'status.running': 'Ejecutando consulta…', 'status.exported': '{file} exportado.',
  'error.engine': 'No se pudo cargar el motor DuckDB. Comprueba tu conexión e inténtalo de nuevo.',
  'error.query': 'La consulta falló: {message}', 'error.unsupported': '{name} no es un tipo de archivo compatible.',
  'error.import': 'No se pudo importar {name}: {message}',
  'error.no_table': 'Elige una tabla para buscar.', 'error.search_empty': 'Escribe el texto que quieres buscar.',
  'tables.columns_of': 'mostrar columnas de {name}', 'tables.preview': 'Vista previa', 'tables.preview_aria': 'Vista previa de la tabla {name}',
  'tables.drop': 'Eliminar', 'tables.drop_aria': 'Eliminar tabla {name}',
  'results.no_rows': 'La consulta no devolvió filas.', 'results.null': 'NULO',
  'results.summary.one': '{count} fila en {ms} ms.', 'results.summary.other': '{count} filas en {ms} ms.',
  'results.truncated': 'Mostrando las primeras {shown} de {total} filas. Las exportaciones incluyen todas las filas.',
};

const DICTS = { en, 'pt-BR': ptBR, es };

// Element ids whose text content is a translation key of the same name.
const STATIC_IDS = Object.keys(en).filter((k) => !/^(status|error|tables|results)\./.test(k));

export const currentLocale = () => locale;
export const formatNumber = (n) => new Intl.NumberFormat(locale).format(n);

export function t(key, params = {}) {
  let template;
  if (params.count !== undefined && DICTS[locale][key + '.' + new Intl.PluralRules(locale).select(params.count)]) {
    template = DICTS[locale][key + '.' + new Intl.PluralRules(locale).select(params.count)];
  } else {
    template = DICTS[locale][key] ?? en[key] ?? key;
  }
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? (typeof params[k] === 'number' ? formatNumber(params[k]) : String(params[k])) : `{${k}}`,
  );
}

function applyStatic() {
  document.documentElement.lang = locale;
  for (const id of STATIC_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (id === 'page-title') document.title = DICTS[locale][id];
    el.textContent = DICTS[locale][id] ?? en[id];
  }
}

function detect() {
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* storage may be blocked */ }
  const wanted = saved || navigator.language || 'en';
  return LOCALES.find((l) => l === wanted) || LOCALES.find((l) => l.split('-')[0] === wanted.split('-')[0]) || 'en';
}

export async function initI18n() {
  locale = detect();
  applyStatic();
}

export function setLocale(next) {
  if (!DICTS[next]) return;
  locale = next;
  try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  applyStatic();
  for (const fn of listeners) fn(next);
}

export const onLocaleChange = (fn) => { listeners.push(fn); };

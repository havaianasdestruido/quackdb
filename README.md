# quackdb

Simple DuckDB viewer, fully client-side. Load CSV, TSV, Parquet, JSON or NDJSON files and explore them with SQL, a text search, and CSV/JSON export. Nothing is uploaded.

- Plain semantic HTML, no CSS (see the `plainhtml` rules); accessibility aligned with WCAG 2.2 AA.
- Languages: English, Português (Brasil), Español.
- Engine: [DuckDB-WASM](https://github.com/duckdb/duckdb-wasm), loaded from jsDelivr (needs internet on first load).

## Files

- `src/index.html` – the UI
- `src/main.js` – UI wiring
- `src/db.js` – DuckDB-WASM engine, import, listing, queries
- `src/utils.js` – pure helpers (SQL quoting, search SQL, CSV/JSON export)
- `src/i18n.js` – translations

## Run locally

ES modules need a server: `python3 -m http.server -d src` and open http://localhost:8000.
Deployed to GitHub Pages from `src/` by `.github/workflows/static.yml`.

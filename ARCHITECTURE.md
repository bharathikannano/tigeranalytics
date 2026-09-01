# Architecture Deliverables
## Retail Pricing Feed Management System

> **Stack:** React 18 + Vite + TypeScript + TailwindCSS (client) · Node.js + Express (server) · SQLite3/better-sqlite3 (database)

---

## 1. Context Diagram

> Who uses the system and what does it touch?

```mermaid
graph LR
    classDef actor  fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f,font-weight:bold
    classDef system fill:#fef9c3,stroke:#ca8a04,color:#78350f,font-weight:bold
    classDef store  fill:#dcfce7,stroke:#16a34a,color:#14532d,font-weight:bold
    classDef db     fill:#f3e8ff,stroke:#9333ea,color:#4a1d96,font-weight:bold

    A(["🧑 Store Manager\n(Admin User)"]):::actor
    S["Pricing Feed\nManagement System"]:::system
    F(["CSV Price Feeds\n(from retail stores)"]):::store
    D[("SQLite\nDatabase")]:::db

    F -- "Delivered by\noperations team" --> A
    A -- "1-Upload CSV\n   via browser UI" --> S
    A -- "2-Search and filter\n   pricing records" --> S
    A -- "3-Edit individual\n   record inline" --> S
    S -- "Read / Write\npricing records" --> D
    S -- "Log every upload\nwith audit trail" --> D
```

---

## 2. Solution Architecture

### 2a. Component Map

```mermaid
graph TD
    classDef page   fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef comp   fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    classDef api    fill:#fef9c3,stroke:#ca8a04,color:#78350f
    classDef route  fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef mw     fill:#fce7f3,stroke:#db2777,color:#831843
    classDef db     fill:#f3e8ff,stroke:#9333ea,color:#4a1d96

    subgraph BROWSER["Browser — React 18 + Vite (port 5173)"]
        direction TB
        APP["App.tsx — Router + Nav"]:::page
        UP["UploadPage.tsx"]:::page
        SP["SearchPage.tsx"]:::page
        DZ["UploadDropzone"]:::comp
        FB["FilterBar"]:::comp
        PT["PricingTable"]:::comp
        PG["Pagination"]:::comp
        AC["api/pricing.ts\nuploadCsv · searchPricing\nupdatePricingRecord · getUploadLogs"]:::api
        TY["types/pricing.ts\nPricingRecord · UploadLog\nSearchFilters"]:::api
    end

    subgraph SERVER["Express Server (port 4000)"]
        direction TB
        MW["app.js — Middleware\nhelmet · cors · morgan\nrate-limit · body-parser"]:::mw
        PR["routes/pricing.js\nPOST /upload\nGET  /\nPUT  /:id\nGET  /upload-logs"]:::route
        VP["validatePricing.js\nvalidateCsvRow\nupdatePricingValidators"]:::mw
        EH["errorHandler.js\nMulter · Validation · 500"]:::mw
        DB["db.js\nSchema · Indexes\nPrepared statements"]:::db
    end

    subgraph DATABASE["SQLite3 — WAL mode"]
        direction LR
        LG[("upload_logs")]:::db
        RC[("pricing_records")]:::db
        LG -- "FK upload_id" --> RC
    end

    APP --> UP & SP
    UP --> DZ & AC
    SP --> FB & PT & PG & AC
    PT --> AC

    AC -- "POST /api/pricing/upload" --> MW
    AC -- "GET  /api/pricing" --> MW
    AC -- "PUT  /api/pricing/:id" --> MW
    AC -- "GET  /api/pricing/upload-logs" --> MW

    MW --> PR
    PR --> VP & DB
    MW --> EH
    DB --> LG & RC
```

---

### 2b. Upload Flow

```mermaid
sequenceDiagram
    autonumber
    actor U as Admin
    participant UI as UploadPage
    participant XHR as XHR progress events
    participant MW as Express middleware
    participant PP as PapaParse
    participant V  as validateCsvRow
    participant TX as SQLite transaction

    U  ->> UI  : Drops or selects CSV file
    UI ->> UI  : Shows file name and size
    U  ->> UI  : Clicks Upload button

    UI ->> XHR : POST /api/pricing/upload (multipart)
    XHR -->> UI: progress events → progress bar %

    XHR ->> MW : Request hits Express
    MW  ->> MW : helmet, cors, morgan pass through
    MW  ->> MW : multer — check MIME type and file size

    alt File rejected
        MW -->> UI : 415 wrong type / 413 too large
        UI -->> U  : Error banner
    end

    MW  ->> PP  : Parse CSV buffer
    PP  ->> PP  : Normalise headers (trim, lowercase, underscores)
    PP  -->> MW : Parsed rows array
    MW  ->> MW  : Check 5 required columns present

    alt Missing columns
        MW -->> UI : 422 MissingColumns
        UI -->> U  : Shows missing column names
    end

    loop Every CSV row
        MW ->> V  : validateCsvRow(row, index)
        V  -->> MW: Error strings if invalid
    end

    alt Any row invalid
        MW -->> UI : 422 ValidationErrors — full row error list
        UI -->> U  : Scrollable error list
    else All rows valid
        MW ->> TX  : BEGIN TRANSACTION
        TX ->> TX  : INSERT upload_log
        TX ->> TX  : INSERT pricing_records x N rows
        TX ->> TX  : COMMIT
        MW -->> UI : 201 uploadId, rowsInserted, fileName
        UI ->> UI  : Refresh upload history table
        UI -->> U  : Success banner with row count
    end
```

---

### 2c. Search and Edit Flow

```mermaid
sequenceDiagram
    autonumber
    actor U  as Admin
    participant FB as FilterBar
    participant SP as SearchPage
    participant API as api/pricing.ts
    participant SRV as Express GET /api/pricing
    participant DB  as SQLite

    Note over SP: Auto-search fires on mount with default filters

    U  ->> FB  : Fills filter fields (store, sku, price, dates)
    U  ->> FB  : Clicks Search
    FB ->> SP  : onChange + onSearch
    SP ->> API : searchPricing(filters)
    API ->> SRV: GET /api/pricing?storeId=X&page=1&pageSize=50

    SRV ->> SRV: Validate sortBy/sortDir against allowlist
    SRV ->> DB : SELECT COUNT(*) WHERE conditions
    SRV ->> DB : SELECT * WHERE conditions ORDER BY LIMIT OFFSET
    DB  -->> SRV: Rows + total count
    SRV -->> SP : data array + pagination object
    SP  -->> U  : Table with results and record count

    U  ->> SP  : Clicks page number
    SP ->> SRV : GET /api/pricing?...&page=N
    SRV ->> DB : LIMIT 50 OFFSET N-1 * 50
    DB  -->> SP : Next page rows
    SP  -->> U  : Table updates

    Note over U,DB: Inline editing

    U  ->> SP  : Clicks Edit on a row
    SP ->> SP  : Row switches to input fields
    U  ->> SP  : Changes a field (e.g. price)
    U  ->> SP  : Clicks Save

    SP ->> SRV : PUT /api/pricing/:id with changed fields only
    SRV ->> SRV: express-validator checks fields

    alt Validation fails
        SRV -->> SP: 422 error
        SP  -->> U : Inline error message
    else Valid
        SRV ->> DB : UPDATE pricing_records SET field=value, updated_at=now WHERE id
        DB  -->> SRV: Updated row
        SRV -->> SP : 200 updated record
        SP  ->> SP  : Replace record in local state (no reload)
        SP  -->> U  : Row reverts to read view with new value
    end
```

---

## 3. Design Decisions

| # | Decision | Why |
|---|---|---|
| D1 | SQLite + better-sqlite3 | Zero infrastructure. Synchronous API simplifies Express handlers. WAL enables concurrent reads. Swap path to PostgreSQL is straightforward if scale demands. |
| D2 | All-or-nothing CSV validation | Every row validated before any write. No partial state. Users get a full error list to fix before re-uploading. |
| D3 | In-memory CSV parsing | multer memoryStorage + PapaParse from Buffer. No temp files. Header normalisation (trim → lowercase → underscores) makes format forgiving. |
| D4 | SQLite transaction for bulk insert | upload_log + all pricing_records in one transaction. Any failure rolls back everything. Audit log is never out of sync. |
| D5 | Allowlist for ORDER BY | sortBy and sortDir checked against hardcoded arrays before SQL interpolation. Prevents ORDER BY injection while allowing dynamic sorting. |
| D6 | XHR instead of fetch for uploads | XMLHttpRequest.upload exposes progress events for accurate % progress bar. fetch API does not support upload progress in mainstream browsers. |
| D7 | Vite /api proxy | Proxies /api to port 4000 in dev. Client and server appear same-origin. Eliminates dev CORS issues without any production config change. |
| D8 | Covering indexes on pricing_records | Indexes on store_id, sku, record_date, (store_id, sku), product_name COLLATE NOCASE match the most common filter patterns. |
| D9 | COALESCE partial UPDATE | UPDATE SET field = COALESCE(@field, field). PUT endpoint only needs changed fields. Inline editor sends only modified fields. |
| D10 | Centralised error handler | One middleware handles multer, validation, and 500 errors uniformly. Stack traces stripped in production. |

---

## 4. Non-Functional Requirements

### Performance

| Area | Implementation |
|---|---|
| Query speed | 5 covering indexes, WAL mode, PRAGMA cache_size = -64000 (64 MB) |
| Upload throughput | multer memory storage, single-pass PapaParse, bulk insert in one transaction |
| Pagination cap | Results hard-capped at 200 rows per page |
| Frontend load | Vite tree-shaking and code-splitting, TailwindCSS purged at build |
| Rate protection | express-rate-limit: 200 req / 60 s per IP |

### Security

| Threat | Mitigation |
|---|---|
| HTTP header attacks | helmet sets CSP, X-Frame-Options, HSTS, X-XSS-Protection |
| CORS abuse | Strict origin allowlist from CORS_ORIGIN env var |
| Malicious file upload | multer rejects non-CSV MIME types (415) and oversized files (413) |
| SQL injection via filters | Parameterised prepared statements for all user values |
| SQL injection via sort | sortBy and sortDir validated against hardcoded allowlists |
| Input tampering PUT | express-validator validates type and length for every body field |
| API abuse | Rate limiter at /api/ prefix with RFC-compliant headers |
| Info leakage | errorHandler strips stack traces in NODE_ENV=production |

### Reliability and Data Integrity

| Concern | Implementation |
|---|---|
| Atomic uploads | Entire bulk insert in a single SQLite transaction |
| Audit trail | upload_logs records every attempt with filename, row count, outcome |
| Referential integrity | PRAGMA foreign_keys = ON; pricing_records.upload_id references upload_logs |
| Graceful shutdown | SIGTERM/SIGINT handlers drain in-flight requests before exit |
| DB durability | PRAGMA synchronous = NORMAL with WAL balances durability and speed |

### Usability and Maintainability

| Goal | Implementation |
|---|---|
| Frictionless upload | Drag-and-drop zone, progress bar, inline CSV format hint |
| Actionable errors | Row-level error strings shown in scrollable list |
| No-reload editing | Record replaced in local React state after PUT — no page refresh |
| Responsive layout | TailwindCSS sm: lg: xl: breakpoints throughout |
| Env-driven config | PORT, DB_PATH, CORS_ORIGIN, UPLOAD_SIZE_LIMIT_MB, RATE_LIMIT_* all in .env |

---

## 5. Assumptions

1. **Internal users only** — No auth layer. Trusted retail ops staff only. JWT middleware is the extension path if external access is needed.
2. **CSV format contract** — Feeds always have the five required columns. Header matching is case-insensitive after normalisation.
3. **Reasonable file sizes** — Uploads stay under 50 MB (configurable via UPLOAD_SIZE_LIMIT_MB).
4. **Single-server deployment** — SQLite suits one process. Horizontal scaling requires migrating to PostgreSQL with a connection pool.
5. **Append-only ingestion** — Uploads always insert new rows. Duplicate (store_id, sku, record_date) combos are allowed. Idempotency would require a UNIQUE constraint + ON CONFLICT REPLACE.
6. **Date format flexibility** — Any date parseable by new Date() is accepted and normalised to YYYY-MM-DD for storage.
7. **Node.js v18+ runtime** — No container orchestration assumed. A process manager (pm2, systemd) is expected for production.

---

## 6. Source for the Implementation

### Directory Structure

```
Round2/
├── ARCHITECTURE.md              <- this document
├── sample_feed.csv              <- example CSV (10 stores, 5 columns, 21 rows)
│
├── server/                      Express backend
│   ├── .env                     PORT=4000, DB_PATH, CORS_ORIGIN, upload/rate limits
│   ├── package.json             express, better-sqlite3, multer, papaparse,
│   │                            helmet, cors, morgan, express-rate-limit,
│   │                            express-validator, uuid, dotenv
│   └── src/
│       ├── index.js             Entry point — app.listen + graceful shutdown
│       ├── app.js               Middleware stack: helmet->cors->morgan->rate-limit->routes
│       ├── db.js                SQLite init, PRAGMA tuning, schema DDL, indexes
│       ├── routes/
│       │   └── pricing.js       Upload, list, update, upload-logs handlers
│       └── middleware/
│           ├── validatePricing.js  validateCsvRow() + express-validator for PUT
│           └── errorHandler.js     Central handler for multer, validation, 500 errors
│
└── client/                      React 18 + Vite + TypeScript + TailwindCSS
    ├── index.html               HTML shell
    ├── vite.config.ts           React plugin + /api proxy to port 4000
    ├── tailwind.config.js       Custom brand colour palette
    └── src/
        ├── main.tsx             Mounts <App />
        ├── index.css            @tailwind + .btn-* .input .label .card .badge-*
        ├── App.tsx              BrowserRouter + nav + Routes
        ├── types/pricing.ts     PricingRecord, UploadLog, SearchFilters, response types
        ├── api/pricing.ts       uploadCsv (XHR), searchPricing, updatePricingRecord, getUploadLogs
        ├── pages/
        │   ├── UploadPage.tsx   File select, progress, banners, upload history table
        │   └── SearchPage.tsx   Filter state, loading skeleton, results, pagination
        └── components/
            ├── UploadDropzone.tsx  Drag-and-drop + hidden file input
            ├── FilterBar.tsx       7 filter inputs + sort selects + page-size
            ├── PricingTable.tsx    Grid with per-row edit/save/cancel toggle
            └── Pagination.tsx      Smart strip with ellipsis (+-2 window)
```

### REST API Reference

| Method | Path | Description |
|---|---|---|
| POST | /api/pricing/upload | Upload CSV — validate all rows, bulk-insert in transaction |
| GET  | /api/pricing | List/filter records — 7 filters + pagination + sort |
| PUT  | /api/pricing/:id | Partial update of one record (any subset of 5 fields) |
| GET  | /api/pricing/upload-logs | Paginated upload audit history |
| GET  | /health | Health check { status: "ok", ts: "..." } |

### How to Run Locally

```bash
# Terminal 1 — Backend
cd server && npm install && npm run dev
# Runs on http://localhost:4000

# Terminal 2 — Frontend
cd client && npm install && npm run dev
# Runs on http://localhost:5173

# Quick smoke test with sample data
curl -F "file=@sample_feed.csv" http://localhost:4000/api/pricing/upload
```

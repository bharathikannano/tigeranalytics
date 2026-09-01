'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/pricing.db';
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('cache_size = -64000'); // 64 MB cache

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS upload_logs (
    id          TEXT PRIMARY KEY,
    file_name   TEXT NOT NULL,
    row_count   INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    status      TEXT NOT NULL CHECK(status IN ('success','partial','failed')),
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS pricing_records (
    id           TEXT PRIMARY KEY,
    store_id     TEXT NOT NULL,
    sku          TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price        REAL NOT NULL,
    record_date  TEXT NOT NULL,
    upload_id    TEXT REFERENCES upload_logs(id),
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- Covering indexes for common search patterns
  CREATE INDEX IF NOT EXISTS idx_pricing_store    ON pricing_records(store_id);
  CREATE INDEX IF NOT EXISTS idx_pricing_sku      ON pricing_records(sku);
  CREATE INDEX IF NOT EXISTS idx_pricing_date     ON pricing_records(record_date);
  CREATE INDEX IF NOT EXISTS idx_pricing_store_sku ON pricing_records(store_id, sku);
  CREATE INDEX IF NOT EXISTS idx_pricing_name      ON pricing_records(product_name COLLATE NOCASE);
`);

module.exports = db;

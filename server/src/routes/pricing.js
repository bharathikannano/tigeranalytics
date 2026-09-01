'use strict';

const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');

const db = require('../db');
const { updatePricingValidators, validateCsvRow } = require('../middleware/validatePricing');

const router = express.Router();

// ── Multer config ─────────────────────────────────────────────────────────────
const MAX_MB = parseInt(process.env.UPLOAD_SIZE_LIMIT_MB || '50', 10);
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(null, true);
    }
    const err = new Error('Only CSV files are allowed');
    err.type = 'INVALID_FILE_TYPE';
    cb(err);
  },
});

// ── Prepared statements ───────────────────────────────────────────────────────
const insertRecord = db.prepare(`
  INSERT INTO pricing_records (id, store_id, sku, product_name, price, record_date, upload_id)
  VALUES (@id, @store_id, @sku, @product_name, @price, @record_date, @upload_id)
`);

const insertLog = db.prepare(`
  INSERT INTO upload_logs (id, file_name, row_count, error_count, status)
  VALUES (@id, @file_name, @row_count, @error_count, @status)
`);

const updateRecord = db.prepare(`
  UPDATE pricing_records
  SET store_id     = COALESCE(@store_id,     store_id),
      sku          = COALESCE(@sku,          sku),
      product_name = COALESCE(@product_name, product_name),
      price        = COALESCE(@price,        price),
      record_date  = COALESCE(@record_date,  record_date),
      updated_at   = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id = @id
`);

// ── POST /api/pricing/upload ──────────────────────────────────────────────────
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return next(err);
    handleUpload(req, res, next);
  });
});

function handleUpload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'BadRequest', message: 'No file uploaded' });
    }

    const csvText = req.file.buffer.toString('utf-8');

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    if (!parsed.data || parsed.data.length === 0) {
      return res.status(422).json({ error: 'EmptyFile', message: 'CSV file contains no data rows' });
    }

    // Validate required columns exist
    const requiredCols = ['store_id', 'sku', 'product_name', 'price', 'date'];
    const headers = parsed.meta.fields || [];
    const missing = requiredCols.filter((c) => !headers.includes(c));
    if (missing.length > 0) {
      return res.status(422).json({
        error: 'MissingColumns',
        message: `CSV is missing required columns: ${missing.join(', ')}`,
        expected: requiredCols,
        found: headers,
      });
    }

    // Row-level validation
    const rowErrors = [];
    parsed.data.forEach((row, idx) => {
      const errs = validateCsvRow(row, idx);
      rowErrors.push(...errs);
    });

    if (rowErrors.length > 0) {
      return res.status(422).json({
        error: 'ValidationErrors',
        message: `${rowErrors.length} row(s) failed validation — no records were saved`,
        errors: rowErrors,
      });
    }

    // Transactional bulk insert
    const uploadId = uuidv4();
    const bulkInsert = db.transaction((rows) => {
      insertLog.run({
        id: uploadId,
        file_name: req.file.originalname,
        row_count: rows.length,
        error_count: 0,
        status: 'success',
      });
      for (const row of rows) {
        insertRecord.run({
          id: uuidv4(),
          store_id: String(row.store_id).trim(),
          sku: String(row.sku).trim(),
          product_name: String(row.product_name).trim(),
          price: parseFloat(row.price),
          record_date: new Date(row.date).toISOString().slice(0, 10),
          upload_id: uploadId,
        });
      }
    });

    bulkInsert(parsed.data);

    return res.status(201).json({
      message: 'Upload successful',
      uploadId,
      rowsInserted: parsed.data.length,
      fileName: req.file.originalname,
    });
  } catch (err) {
    next(err);
  }
}


// ── GET /api/pricing ──────────────────────────────────────────────────────────
router.get('/', (req, res, next) => {
  try {
    const {
      storeId,
      sku,
      productName,
      dateFrom,
      dateTo,
      minPrice,
      maxPrice,
      page = '1',
      pageSize = '50',
      sortBy = 'created_at',
      sortDir = 'desc',
    } = req.query;

    const allowedSort = ['store_id', 'sku', 'product_name', 'price', 'record_date', 'created_at', 'updated_at'];
    const allowedDir = ['asc', 'desc'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
    const safeDir = allowedDir.includes(sortDir.toLowerCase()) ? sortDir.toLowerCase() : 'desc';

    const conditions = [];
    const params = {};

    if (storeId) { conditions.push('store_id LIKE @storeId'); params.storeId = `%${storeId}%`; }
    if (sku)     { conditions.push('sku LIKE @sku');         params.sku = `%${sku}%`; }
    if (productName) {
      conditions.push('product_name LIKE @productName COLLATE NOCASE');
      params.productName = `%${productName}%`;
    }
    if (dateFrom) { conditions.push('record_date >= @dateFrom'); params.dateFrom = dateFrom; }
    if (dateTo)   { conditions.push('record_date <= @dateTo');   params.dateTo = dateTo; }
    if (minPrice !== undefined && minPrice !== '') {
      conditions.push('price >= @minPrice'); params.minPrice = parseFloat(minPrice);
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      conditions.push('price <= @maxPrice'); params.maxPrice = parseFloat(maxPrice);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = db.prepare(`SELECT COUNT(*) as count FROM pricing_records ${where}`).get(params).count;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(200, parseInt(pageSize, 10));
    const limit  = Math.min(200, parseInt(pageSize, 10));

    const rows = db
      .prepare(`SELECT * FROM pricing_records ${where} ORDER BY ${safeSort} ${safeDir} LIMIT @limit OFFSET @offset`)
      .all({ ...params, limit, offset });

    return res.json({
      data: rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/pricing/:id ──────────────────────────────────────────────────────
router.put('/:id', updatePricingValidators, (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: 'ValidationErrors', errors: errors.array() });
    }

    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM pricing_records WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'NotFound', message: `Record ${id} not found` });
    }

    const { store_id, sku, product_name, price, record_date } = req.body;

    updateRecord.run({
      id,
      store_id:     store_id     ? String(store_id).trim()     : null,
      sku:          sku          ? String(sku).trim()          : null,
      product_name: product_name ? String(product_name).trim() : null,
      price:        price !== undefined ? parseFloat(price)    : null,
      record_date:  record_date  ? new Date(record_date).toISOString().slice(0, 10) : null,
    });

    const updated = db.prepare('SELECT * FROM pricing_records WHERE id = ?').get(id);
    return res.json({ message: 'Record updated', data: updated });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/pricing/upload-logs ──────────────────────────────────────────────
router.get('/upload-logs', (req, res, next) => {
  try {
    const { page = '1', pageSize = '20' } = req.query;
    const limit  = Math.min(100, parseInt(pageSize, 10));
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limit;

    const total = db.prepare('SELECT COUNT(*) as count FROM upload_logs').get().count;
    const logs  = db.prepare('SELECT * FROM upload_logs ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);

    return res.json({
      data: logs,
      pagination: { total, page: parseInt(page, 10), pageSize: limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

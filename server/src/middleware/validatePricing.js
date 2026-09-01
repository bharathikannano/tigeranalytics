'use strict';

const { body, param } = require('express-validator');

/**
 * Validators for PUT /api/pricing/:id
 */
const updatePricingValidators = [
  param('id').isUUID().withMessage('Invalid record id'),
  body('store_id')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('store_id cannot be blank')
    .isLength({ max: 100 })
    .withMessage('store_id too long'),
  body('sku')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('sku cannot be blank')
    .isLength({ max: 100 })
    .withMessage('sku too long'),
  body('product_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('product_name cannot be blank')
    .isLength({ max: 500 })
    .withMessage('product_name too long'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('price must be a non-negative number'),
  body('record_date')
    .optional()
    .isISO8601()
    .withMessage('record_date must be a valid ISO-8601 date (YYYY-MM-DD)'),
];

/**
 * Validates a single parsed CSV row. Returns array of error strings (empty = valid).
 */
function validateCsvRow(row, rowIndex) {
  const errors = [];
  const n = rowIndex + 1;

  if (!row.store_id || String(row.store_id).trim() === '')
    errors.push(`Row ${n}: store_id is required`);

  if (!row.sku || String(row.sku).trim() === '')
    errors.push(`Row ${n}: sku is required`);

  if (!row.product_name || String(row.product_name).trim() === '')
    errors.push(`Row ${n}: product_name is required`);

  const price = parseFloat(row.price);
  if (row.price === undefined || row.price === null || row.price === '' || isNaN(price) || price < 0)
    errors.push(`Row ${n}: price must be a non-negative number (got "${row.price}")`);

  if (!row.date || String(row.date).trim() === '') {
    errors.push(`Row ${n}: date is required`);
  } else {
    const d = new Date(row.date);
    if (isNaN(d.getTime()))
      errors.push(`Row ${n}: date "${row.date}" is not a valid date`);
  }

  return errors;
}

module.exports = { updatePricingValidators, validateCsvRow };

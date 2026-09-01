'use strict';

/**
 * Centralised error handler — never leaks internal details in production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Multer file size / type errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: `Maximum upload size is ${process.env.UPLOAD_SIZE_LIMIT_MB || 50} MB`,
    });
  }

  if (err.type === 'INVALID_FILE_TYPE') {
    return res.status(415).json({ error: 'Invalid file type', message: err.message });
  }

  const status = err.status || err.statusCode || 500;
  const response = {
    error: err.name || 'InternalServerError',
    message: status < 500 || isDev ? err.message : 'An unexpected error occurred',
  };

  if (isDev && err.stack) response.stack = err.stack;

  return res.status(status).json(response);
}

module.exports = errorHandler;

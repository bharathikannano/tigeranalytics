'use strict';

require('dotenv').config();
const app = require('./app');

const PORT = parseInt(process.env.PORT || '4000', 10);

const server = app.listen(PORT, () => {
  console.log(`[server] Retail Pricing API running on http://localhost:${PORT}`);
  console.log(`[server] Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`[server] Database    : ${process.env.DB_PATH || './data/pricing.db'}`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`[server] ${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[server] Forced shutdown after 10s');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

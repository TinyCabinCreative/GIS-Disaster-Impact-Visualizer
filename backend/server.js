require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const db = require('./src/config/database');

const PORT = process.env.PORT || 5000;

// Test database connection
db.connect()
  .then(client => {
    logger.info('PostgreSQL connected successfully');
    
    // Test PostGIS extension
    return client.query('SELECT PostGIS_Version()');
  })
  .then(result => {
    logger.info(`PostGIS version: ${result.rows[0].postgis_version}`);
  })
  .catch(err => {
    logger.error('Database connection failed:', err);
    process.exit(1);
  });

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  logger.info(`📍 API available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    db.end();
    process.exit(0);
  });
});

module.exports = server;
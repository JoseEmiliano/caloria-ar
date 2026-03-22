const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'caloria_db',
  user:     process.env.DB_USER     || 'caloria_user',
  password: process.env.DB_PASSWORD || '',
});

pool.on('connect', () => {
  console.log('[DB] Conexión establecida con PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool:', err.message);
  process.exit(1);
});

module.exports = pool;

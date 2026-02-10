const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('✅ Conectado a la base de datos PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el cliente de base de datos', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool
};

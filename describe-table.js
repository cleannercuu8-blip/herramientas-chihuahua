const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function describeTable() {
    try {
        console.log('Consultando estructura de tabla herramientas...');
        const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'herramientas'
    `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error al consultar tabla:', err);
        process.exit(1);
    }
}

describeTable();

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
console.log('Intentando conectar a:', connectionString.split('@')[1] || 'URL inválida');

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    try {
        const start = Date.now();
        console.log('Enviando query ping...');
        const res = await pool.query('SELECT NOW()');
        console.log('✅ ÉXITO: Conexión establecida en', Date.now() - start, 'ms');
        console.log('Resultado:', res.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR de conexión:', err);
        process.exit(1);
    }
}

test();

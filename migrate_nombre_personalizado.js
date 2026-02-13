const pool = require('./backend/config/database');

async function migrate() {
    try {
        console.log('Iniciando migración: Agregar columna nombre_personalizado...');
        await pool.query('ALTER TABLE herramientas ADD COLUMN IF NOT EXISTS nombre_personalizado TEXT;');
        console.log('✅ Migración completada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    }
}

migrate();

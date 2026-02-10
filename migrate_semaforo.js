const db = require('./backend/config/database');

async function migrate() {
    try {
        console.log('🚀 Iniciando migración de base de datos...');

        // Agregar columnas si no existen
        const sql = `
            ALTER TABLE organizaciones 
            ADD COLUMN IF NOT EXISTS semaforo TEXT DEFAULT 'ROJO',
            ADD COLUMN IF NOT EXISTS detalles_semaforo JSONB;
        `;

        await db.query(sql);
        console.log('✅ Columnas agregadas exitosamente');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    }
}

migrate();

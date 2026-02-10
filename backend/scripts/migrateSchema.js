const db = require('../config/database');

/**
 * Script de migración para agregar nuevas columnas a las tablas existentes
 */
async function migrarEsquema() {
    try {
        console.log('🔧 Iniciando migración de esquema de base de datos...\n');

        // Migrar tabla organizaciones
        console.log('📋 Agregando columnas a tabla organizaciones...');

        try {
            await db.query(`
                ALTER TABLE organizaciones 
                ADD COLUMN IF NOT EXISTS titular TEXT,
                ADD COLUMN IF NOT EXISTS decreto_creacion TEXT
            `);
            console.log('✅ Columnas agregadas a organizaciones\n');
        } catch (error) {
            if (error.code === '42701') { // duplicate_column
                console.log('ℹ️  Las columnas ya existen en organizaciones\n');
            } else {
                throw error;
            }
        }

        // Migrar tabla herramientas
        console.log('📋 Agregando columnas a tabla herramientas...');

        try {
            await db.query(`
                ALTER TABLE herramientas 
                ADD COLUMN IF NOT EXISTS estatus_poe TEXT,
                ADD COLUMN IF NOT EXISTS comentarios TEXT
            `);
            console.log('✅ Columnas agregadas a herramientas\n');
        } catch (error) {
            if (error.code === '42701') { // duplicate_column
                console.log('ℹ️  Las columnas ya existen en herramientas\n');
            } else {
                throw error;
            }
        }

        console.log('✅ Migración completada exitosamente\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    }
}

// Ejecutar migración
migrarEsquema();

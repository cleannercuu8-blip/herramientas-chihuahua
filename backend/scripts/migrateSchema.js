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

        // Migrar tipos de herramientas y tipos de organizaciones
        console.log('📋 Actualizando restricciones de tipo y unificando herramientas...');
        try {
            // 1. Eliminar restricciones de check anteriores para permitir nuevos valores
            await db.query(`ALTER TABLE herramientas DROP CONSTRAINT IF EXISTS herramientas_tipo_herramienta_check`);
            await db.query(`ALTER TABLE organizaciones DROP CONSTRAINT IF EXISTS organizaciones_tipo_check`);

            // 2. Unificar tipos existentes
            await db.query(`
                UPDATE herramientas 
                SET tipo_herramienta = 'REGLAMENTO_ESTATUTO' 
                WHERE tipo_herramienta IN ('REGLAMENTO_INTERIOR', 'ESTATUTO_ORGANICO')
            `);

            // 3. Agregar nuevas restricciones actualizadas
            await db.query(`
                ALTER TABLE herramientas 
                ADD CONSTRAINT herramientas_tipo_herramienta_check 
                CHECK (tipo_herramienta IN ('ORGANIGRAMA', 'REGLAMENTO_INTERIOR', 'ESTATUTO_ORGANICO', 'REGLAMENTO_ESTATUTO', 'MANUAL_ORGANIZACION', 'MANUAL_PROCEDIMIENTOS', 'MANUAL_SERVICIOS'))
            `);

            await db.query(`
                ALTER TABLE organizaciones 
                ADD CONSTRAINT organizaciones_tipo_check 
                CHECK (tipo IN ('DEPENDENCIA', 'ENTIDAD_PARAESTATAL', 'ORGANISMO_AUTONOMO'))
            `);

            console.log('✅ Tipos unificados y restricciones actualizadas\n');
        } catch (error) {
            console.error('⚠️ Advertencia en unificación de tipos:', error.message);
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

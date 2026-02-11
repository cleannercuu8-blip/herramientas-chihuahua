const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const Organizacion = require('../models/Organizacion');
const Herramienta = require('../models/Herramienta');
const Historial = require('../models/Historial');

/**
 * Script de inicialización de la base de datos
 * Crea las tablas y un usuario administrador por defecto
 */
async function inicializarBaseDatos() {
    try {
        console.log('🔧 Inicializando base de datos...\n');

        // Crear tablas
        console.log('📋 Creando tabla de usuarios...');
        await Usuario.crearTabla();
        console.log('✅ Tabla de usuarios creada\n');

        console.log('📋 Creando tabla de organizaciones...');
        await Organizacion.crearTabla();
        console.log('✅ Tabla de organizaciones creada\n');

        console.log('📋 Creando tabla de herramientas...');
        await Herramienta.crearTabla();
        console.log('✅ Tabla de herramientas creada\n');

        console.log('📋 Creando tabla de historial...');
        await Historial.crearTabla();
        console.log('✅ Tabla de historial creada\n');

        console.log('📋 Creando tabla de expedientes...');
        const Expediente = require('../models/Expediente');
        await Expediente.crearTabla();
        console.log('✅ Tabla de expedientes creada\n');

        console.log('📋 Creando tabla de etapas de expediente...');
        const EtapaExpediente = require('../models/EtapaExpediente');
        await EtapaExpediente.crearTabla();
        console.log('✅ Tabla de etapas de expediente creada\n');

        // Crear usuario administrador por defecto
        console.log('👤 Creando usuario administrador por defecto...');
        const passwordHash = await bcrypt.hash('admin123', 10);

        try {
            await Usuario.crear({
                nombre_completo: 'Administrador del Sistema',
                email: 'admin@chihuahua.gob.mx',
                password_hash: passwordHash,
                rol: 'ADMINISTRADOR'
            });
            console.log('✅ Usuario administrador creado');
            console.log('   Email: admin@chihuahua.gob.mx');
            console.log('   Contraseña: admin123');
            console.log('   ⚠️  IMPORTANTE: Cambia esta contraseña después del primer login\n');
        } catch (error) {
            // Postgres error code 23505 is unique_violation
            if (error.code === '23505' || error.message.includes('UNIQUE') || error.message.includes('duplicate key')) {
                console.log('ℹ️  Usuario administrador ya existe\n');
            } else {
                throw error;
            }
        }

        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                                                            ║');
        console.log('║   ✅ Base de datos inicializada correctamente             ║');
        console.log('║                                                            ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error);
        process.exit(1);
    }
}

// Ejecutar inicialización
inicializarBaseDatos();

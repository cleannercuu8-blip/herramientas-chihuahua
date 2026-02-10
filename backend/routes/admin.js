const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const Organizacion = require('../models/Organizacion');
const Herramienta = require('../models/Herramienta');
const Historial = require('../models/Historial');

/**
 * Ruta administrativa para inicializar la base de datos
 * Solo debe usarse una vez para crear las tablas iniciales
 */
router.post('/init-database', async (req, res) => {
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

        res.json({
            success: true,
            message: 'Base de datos inicializada correctamente',
            credentials: {
                email: 'admin@chihuahua.gob.mx',
                password: 'admin123'
            }
        });

    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al inicializar la base de datos',
            details: error.message
        });
    }
});

module.exports = router;

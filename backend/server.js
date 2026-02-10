const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rutas de API
const authRoutes = require('./routes/auth');
const organizacionesRoutes = require('./routes/organizaciones');
const herramientasRoutes = require('./routes/herramientas');
const reportesRoutes = require('./routes/reportes');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/organizaciones', organizacionesRoutes);
app.use('/api/herramientas', herramientasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/admin', adminRoutes);

// Ruta administrativa para inicializar la base de datos
app.post('/api/admin/init-database', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const Usuario = require('./models/Usuario');
        const Organizacion = require('./models/Organizacion');
        const Herramienta = require('./models/Herramienta');
        const Historial = require('./models/Historial');

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

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        mensaje: 'Sistema de Herramientas Organizacionales - Gobierno de Chihuahua',
        version: '1.0.0'
    });
});

// Servir el frontend para cualquier otra ruta
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        mensaje: err.message
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║   Sistema de Registro de Herramientas Organizacionales    ║');
    console.log('║          Gobierno del Estado de Chihuahua                  ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
    console.log(`📊 API disponible en: http://localhost:${PORT}/api`);
    console.log('');
    console.log('Presiona Ctrl+C para detener el servidor');
    console.log('');
});

module.exports = app;

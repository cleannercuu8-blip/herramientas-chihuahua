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

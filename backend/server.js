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

// Health check para Render
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        mensaje: 'Sistema de Herramientas Organizacionales - Gobierno de Chihuahua',
        version: '1.0.0',
        timestamp: new Date()
    });
});

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/organizaciones', require('./routes/organizaciones'));
app.use('/api/herramientas', require('./routes/herramientas'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/import', require('./routes/import'));

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

// Ruta para migrar el esquema (agregar columnas)
app.post('/api/admin/migrate-schema', async (req, res) => {
    try {
        const db = require('./config/database');
        console.log('🔧 Iniciando migración de esquema...\n');

        await db.query(`
            ALTER TABLE organizaciones 
            ADD COLUMN IF NOT EXISTS titular TEXT,
            ADD COLUMN IF NOT EXISTS decreto_creacion TEXT,
            ADD COLUMN IF NOT EXISTS semaforo TEXT DEFAULT 'ROJO',
            ADD COLUMN IF NOT EXISTS detalles_semaforo JSONB
        `);

        await db.query(`
            ALTER TABLE herramientas 
            ADD COLUMN IF NOT EXISTS estatus_poe TEXT,
            ADD COLUMN IF NOT EXISTS comentarios TEXT
        `);

        // Poblar caché inicial
        const Organizacion = require('./models/Organizacion');
        const SemaforoService = require('./utils/semaforo');
        const organizaciones = await Organizacion.obtenerTodas();

        console.log(`📊 Poblando caché para ${organizaciones.length} dependencias con la NUEVA lógica...`);
        for (const org of organizaciones) {
            await SemaforoService.actualizarCacheSemaforo(org.id);
        }

        console.log('✅ Caché de semáforo actualizada');

        res.json({ success: true, message: 'Esquema actualizado y caché poblada correctamente' });
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ruta para importar datos desde el CSV local del servidor (solo si el archivo existe)
app.post('/api/admin/import-data', async (req, res) => {
    try {
        const fs = require('fs');
        const { parse } = require('csv-parse/sync');
        const db = require('./config/database');
        const Organizacion = require('./models/Organizacion');
        const Herramienta = require('./models/Herramienta');

        const dataDir = path.join(__dirname, 'data');
        let csvPath = path.join(dataDir, 'datos.csv');

        // Robustez: Buscar cualquier CSV si datos.csv no existe
        if (!fs.existsSync(csvPath)) {
            const files = fs.readdirSync(dataDir);
            const csvFile = files.find(f => f.toLowerCase().endsWith('.csv'));
            if (csvFile) {
                csvPath = path.join(dataDir, csvFile);
                console.log(`ℹ️  Usando archivo CSV encontrado: ${csvFile}`);
            }
        }

        if (!fs.existsSync(csvPath)) {
            return res.status(404).json({
                success: false,
                error: 'El archivo CSV no se encontró en el servidor'
            });
        }

        // Leer como buffer primero para intentar detectar o forzar encoding
        const buffer = fs.readFileSync(csvPath);
        let fileContent = buffer.toString('utf8');

        // Detección simple: si hay caracteres rotos típicos de Latin1/Win1252
        if (buffer.some(b => b > 127) && !fileContent.match(/[áéíóúÁÉÍÓÚñÑ]/)) {
            try {
                const iconv = require('iconv-lite');
                fileContent = iconv.decode(buffer, 'win1252');
                console.log('ℹ️  Decodificando CSV con Windows-1252');
            } catch (e) {
                console.log('⚠️  iconv-lite no disponible, usando utf8 (posibles errores de acentos)');
            }
        }

        const records = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });

        const { rows: usuarios } = await db.query("SELECT id FROM usuarios WHERE email = 'admin@chihuahua.gob.mx'");
        if (usuarios.length === 0) throw new Error('Usuario admin no encontrado');
        const adminId = usuarios[0].id;

        let importados = 0;
        for (const record of records) {
            const nombreOrg = record['DEPENDENCIA / ENTIDAD'] || record['DEPENDENCIA/ENTIDAD'];
            if (!nombreOrg) continue;

            const sectorStr = record['SECTOR'] || '';
            const tipo = sectorStr.toUpperCase().includes('PARAESTATAL') ? 'ENTIDAD_PARAESTATAL' : 'DEPENDENCIA';

            const datosOrg = {
                nombre: nombreOrg,
                tipo: tipo,
                siglas: '',
                titular: record['NOMBRE TITULAR'],
                decreto_creacion: record['DECRETO DE CREACIÓN'] || record['DECRETO DE CREACION']
            };

            const { rows: orgsExistentes } = await db.query('SELECT id FROM organizaciones WHERE nombre = $1', [nombreOrg]);
            let orgId;

            if (orgsExistentes.length > 0) {
                orgId = orgsExistentes[0].id;
                await Organizacion.actualizar(orgId, { ...datosOrg, activo: 1 });
            } else {
                const nuevaOrg = await Organizacion.crear(datosOrg);
                orgId = nuevaOrg.id;
            }

            const organigramaLink = record['ORGANIGRAMA AUTORIZADO'];
            if (organigramaLink && organigramaLink !== 'N/A' && organigramaLink !== '') {
                const fechaStr = record['FECHA'] || null;
                const estatusPoe = record['Estatus R1 en POE'] || record['ESTATUS EN EL POE'];
                const fechaPoeStr = record['Fecha de Publicación POE'] || record['FECHA DE PUBLICACIÓN'];
                const linkPoe = record['ENLACE POE'] || record['LINK DE PUBLICACIÓN EN EL POE'];
                const comentarios = record['COMENTARIOS'];

                // Mejorar parseo de fechas específicas del CSV (ej: "Octubre 2023", "10-sep-14")
                let fechaEmision = new Date();
                if (fechaStr && fechaStr !== 'N/A') {
                    // Intento de parsear formatos comunes o manuales
                    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    const lowerFecha = fechaStr.toLowerCase();
                    const mesEncontrado = meses.findIndex(m => lowerFecha.includes(m));

                    if (mesEncontrado !== -1) {
                        const año = lowerFecha.match(/\d{4}/);
                        if (año) fechaEmision = new Date(año[0], mesEncontrado, 1);
                    } else {
                        try { fechaEmision = new Date(fechaStr); } catch (e) { }
                    }
                }

                if (isNaN(fechaEmision.getTime())) fechaEmision = new Date();

                await Herramienta.crear({
                    organizacion_id: orgId,
                    tipo_herramienta: 'ORGANIGRAMA',
                    nombre_archivo: 'Organigrama cargado desde Excel',
                    ruta_archivo: organigramaLink,
                    fecha_emision: fechaEmision,
                    fecha_publicacion_poe: fechaPoeStr && fechaPoeStr !== 'N/A' ? new Date(fechaPoeStr) : null,
                    link_publicacion_poe: linkPoe !== 'N/A' ? linkPoe : null,
                    estatus_poe: estatusPoe,
                    comentarios: comentarios !== 'N/A' ? comentarios : null,
                    version: '1.0',
                    usuario_registro_id: adminId
                });
            }
            importados++;
        }

        res.json({ success: true, message: `Importación completada: ${importados} registros procesados` });
    } catch (error) {
        console.error('❌ Error en la importación:', error);
        res.status(500).json({ success: false, error: error.message });
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

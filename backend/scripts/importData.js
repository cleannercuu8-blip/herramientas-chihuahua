const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const db = require('../config/database');
const Organizacion = require('../models/Organizacion');
const Herramienta = require('../models/Herramienta');

async function importarDatos() {
    try {
        console.log('🚀 Iniciando importación de datos desde CSV...\n');

        // Ruta al archivo CSV
        const csvPath = 'C:\\Users\\Alfredo Ochoa\\Documents\\Herramientas y dependencias.csv';

        if (!fs.existsSync(csvPath)) {
            console.error(`❌ Error: El archivo no existe en la ruta: ${csvPath}`);
            process.exit(1);
        }

        const fileContent = fs.readFileSync(csvPath, 'utf8');

        // Configuración de parseo para el formato específico del Excel/CSV del usuario
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        console.log(`📊 Se encontraron ${records.length} registros para procesar.\n`);

        // Necesitamos un ID de usuario para el registro de herramientas (usaremos el admin por defecto)
        const { rows: usuarios } = await db.query("SELECT id FROM usuarios WHERE email = 'admin@chihuahua.gob.mx'");
        if (usuarios.length === 0) {
            console.error('❌ Error: No se encontró el usuario administrador. Ejecuta primero la inicialización/migración.');
            process.exit(1);
        }
        const adminId = usuarios[0].id;

        for (const record of records) {
            const nombreOrg = record['DEPENDENCIA / ENTIDAD'] || record['DEPENDENCIA/ENTIDAD'];
            if (!nombreOrg) continue;

            console.log(`🔍 Procesando: ${nombreOrg}`);

            // 1. Crear o buscar organización
            let orgId;
            const { rows: orgsExistentes } = await db.query('SELECT id FROM organizaciones WHERE nombre = $1', [nombreOrg]);

            const sectorStr = record['SECTOR'] || '';
            const tipo = sectorStr.toUpperCase().includes('PARAESTATAL') ? 'ENTIDAD_PARAESTATAL' : 'DEPENDENCIA';

            const datosOrg = {
                nombre: nombreOrg,
                tipo: tipo,
                siglas: '', // No viene explícito en el Excel
                titular: record['NOMBRE TITULAR'],
                decreto_creacion: record['DECRETO DE CREACIÓN'] || record['DECRETO DE CREACION']
            };

            if (orgsExistentes.length > 0) {
                orgId = orgsExistentes[0].id;
                await Organizacion.actualizar(orgId, { ...datosOrg, activo: 1 });
                console.log(`   ✅ Organización actualizada (ID: ${orgId})`);
            } else {
                const nuevaOrg = await Organizacion.crear(datosOrg);
                orgId = nuevaOrg.id;
                console.log(`   ✅ Organización creada (ID: ${orgId})`);
            }

            // 2. Crear Herramienta (Organigrama)
            const organigramaLink = record['ORGANIGRAMA AUTORIZADO'];
            if (organigramaLink && organigramaLink !== 'N/A' && organigramaLink !== '') {
                const fechaStr = record['FECHA'] || null;
                const estatusPoe = record['Estatus R1 en POE'] || record['ESTATUS EN EL POE'];
                const fechaPoeStr = record['Fecha de Publicación POE'] || record['FECHA DE PUBLICACIÓN'];
                const linkPoe = record['ENLACE POE'] || record['LINK DE PUBLICACIÓN EN EL POE'];
                const comentarios = record['COMENTARIOS'];

                // Intentar limpiar la fecha
                let fechaEmision = new Date();
                if (fechaStr && fechaStr !== 'N/A') {
                    // Si viene como "Enero 2024" o similar, JS Date podría no entenderlo bien
                    // Intentamos un parseo básico o usamos la fecha actual
                    try { fechaEmision = new Date(fechaStr); } catch (e) { }
                    if (isNaN(fechaEmision.getTime())) fechaEmision = new Date();
                }

                await Herramienta.crear({
                    organizacion_id: orgId,
                    tipo_herramienta: 'ORGANIGRAMA',
                    nombre_archivo: 'Organigrama cargado desde Excel',
                    ruta_archivo: organigramaLink, // Usamos el link como ruta
                    fecha_emision: fechaEmision,
                    fecha_publicacion_poe: fechaPoeStr && fechaPoeStr !== 'N/A' ? new Date(fechaPoeStr) : null,
                    link_publicacion_poe: linkPoe !== 'N/A' ? linkPoe : null,
                    estatus_poe: estatusPoe,
                    comentarios: comentarios !== 'N/A' ? comentarios : null,
                    version: '1.0',
                    usuario_registro_id: adminId
                });
                console.log(`   📄 Organigrama registrado`);
            }
        }

        console.log('\n✅ Importación completada exitosamente.');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error durante la importación:', error);
        process.exit(1);
    }
}

importarDatos();

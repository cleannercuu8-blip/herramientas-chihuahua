const ExcelJS = require('exceljs');
const Organizacion = require('../models/Organizacion');
const Herramienta = require('../models/Herramienta');
const db = require('../config/database');

class ImportController {
    /**
     * Importar Organizaciones desde Excel
     */
    static async importarOrganizaciones(req, res) {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(req.file.path);
            const worksheet = workbook.getWorksheet(1); // Usar la primera hoja

            const records = [];
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Saltar encabezado

                // Mapeo esperado: Dependencia/Entidad, Tipo, Siglas, Titular, Decreto
                records.push({
                    nombre: row.getCell(1).text?.trim(),
                    tipo: row.getCell(2).text?.trim(),
                    siglas: row.getCell(3).text?.trim(),
                    titular: row.getCell(4).text?.trim(),
                    decreto_creacion: row.getCell(5).text?.trim(),
                    requiere_manual: row.getCell(6).text?.trim()
                });
            });

            let procesados = 0;
            let errores = [];

            for (const record of records) {
                if (!record.nombre) continue;

                try {
                    // Determinar tipo (Dependencia por defecto)
                    let tipoNorm = 'DEPENDENCIA';
                    if (record.tipo?.toUpperCase().includes('PARAESTATAL') || record.tipo?.toUpperCase().includes('ENTIDAD')) {
                        tipoNorm = 'ENTIDAD_PARAESTATAL';
                    }

                    // Buscar si existe
                    const { rows: existentes } = await db.query('SELECT id FROM organizaciones WHERE nombre = $1', [record.nombre]);

                    const requiereManual = record.requiere_manual?.toUpperCase() === 'NO' ? false : true;

                    if (existentes.length > 0) {
                        await Organizacion.actualizar(existentes[0].id, {
                            nombre: record.nombre,
                            tipo: tipoNorm,
                            siglas: record.siglas || '',
                            titular: record.titular || '',
                            decreto_creacion: record.decreto_creacion || '',
                            activo: 1,
                            requiere_manual_servicios: requiereManual
                        });
                    } else {
                        await Organizacion.crear({
                            nombre: record.nombre,
                            tipo: tipoNorm,
                            siglas: record.siglas || '',
                            titular: record.titular || '',
                            decreto_creacion: record.decreto_creacion || '',
                            requiere_manual_servicios: requiereManual
                        });
                    }
                    procesados++;
                } catch (e) {
                    errores.push(`Fila ${records.indexOf(record) + 2}: ${e.message}`);
                }
            }

            res.json({
                success: true,
                mensaje: `Importación completa: ${procesados} organizaciones procesadas.`,
                alertas: errores.length > 0 ? errores : null
            });

        } catch (error) {
            console.error('Error importando organizaciones:', error);
            res.status(500).json({ error: 'Error al procesar el archivo Excel' });
        }
    }

    /**
     * Importar Herramientas desde Excel
     */
    static async importarHerramientas(req, res) {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(req.file.path);
            const worksheet = workbook.getWorksheet(1);

            const tools = [];
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;

                // Mapeo sugerido: Dependencia Name, Tipo Herramienta, Link, Fecha Emisión (YYYY-MM-DD), Estatus POE, Link POE, Comentarios
                tools.push({
                    orgName: row.getCell(1).text?.trim(),
                    tipo: row.getCell(2).text?.trim(),
                    link: row.getCell(3).text?.trim(),
                    fecha: row.getCell(4).text?.trim(),
                    estatusPoe: row.getCell(5).text?.trim(),
                    linkPoe: row.getCell(6).text?.trim(),
                    comentarios: row.getCell(7).text?.trim(),
                    nombrePersonalizado: row.getCell(8).text?.trim()
                });
            });

            let procesados = 0;
            let omitidos = [];
            const adminId = req.usuario.id;

            for (const item of tools) {
                const filaActual = tools.indexOf(item) + 2;
                if (!item.orgName) continue;

                // 1. Buscar correspondencia de organización (por nombre exacto o siglas)
                const { rows: orgs } = await db.query(
                    'SELECT id FROM organizaciones WHERE UPPER(nombre) = UPPER($1) OR UPPER(siglas) = UPPER($1)',
                    [item.orgName]
                );

                if (orgs.length === 0) {
                    omitidos.push(`Fila ${filaActual}: Dependencia no encontrada ("${item.orgName}")`);
                    continue;
                }

                const orgId = orgs[0].id;

                try {
                    // Validar tipo herramienta (Mapeo más robusto)
                    const tipoMap = {
                        'ORGANIGRAMA': 'ORGANIGRAMA',
                        'REGLAMENTO': 'REGLAMENTO_ESTATUTO',
                        'ESTATUTO': 'REGLAMENTO_ESTATUTO',
                        'INTERIOR': 'REGLAMENTO_ESTATUTO',
                        'ORGANIZACIÓN': 'MANUAL_ORGANIZACION',
                        'ORGANIZACION': 'MANUAL_ORGANIZACION',
                        'PROCEDIMIENTOS': 'MANUAL_PROCEDIMIENTOS',
                        'SERVICIOS': 'MANUAL_SERVICIOS'
                    };

                    let tipoFinal = null;
                    const tipoTexto = item.tipo?.toUpperCase() || '';

                    for (const key in tipoMap) {
                        if (tipoTexto.includes(key)) {
                            tipoFinal = tipoMap[key];
                            break;
                        }
                    }

                    if (!tipoFinal) {
                        omitidos.push(`Fila ${filaActual}: Tipo de herramienta no reconocido ("${item.tipo}")`);
                        continue;
                    }

                    // Si no hay link, el registro falla a menos que sea MANUAL_SERVICIOS? 
                    if (!item.link && tipoFinal !== 'MANUAL_SERVICIOS') {
                        omitidos.push(`Fila ${filaActual}: Link faltante para ${tipoFinal}`);
                        continue;
                    }

                    const datosHerramienta = {
                        organizacion_id: orgId,
                        tipo_herramienta: tipoFinal,
                        nombre_archivo: `Importación: ${item.orgName} - ${tipoFinal}`,
                        ruta_archivo: item.link || 'NO_APLICA',
                        fecha_emision: item.fecha ? new Date(item.fecha) : new Date(),
                        estatus_poe: item.estatusPoe || 'SIN REGISTRO',
                        fecha_publicacion_poe: null,
                        link_publicacion_poe: item.linkPoe || item.link || null,
                        estatus_poe: item.estatusPoe || 'SIN REGISTRO',
                        comentarios: item.comentarios || 'Cargado vía importación masiva',
                        nombre_personalizado: item.nombrePersonalizado || null,
                        version: '1.0',
                        usuario_registro_id: adminId
                    };

                    // Singleton Rule: For Organigram and Regulation, only ONE active record should exist.
                    const singletonTypes = ['ORGANIGRAMA', 'REGLAMENTO_ESTATUTO'];

                    if (singletonTypes.includes(tipoFinal)) {
                        // BUSCAR SI YA EXISTE PARA ACTUALIZAR (SINGLETON)
                        const { rows: existentes } = await db.query(
                            'SELECT id FROM herramientas WHERE organizacion_id = $1 AND tipo_herramienta = $2 AND vigente = 1',
                            [orgId, tipoFinal]
                        );

                        if (existentes.length > 0) {
                            await Herramienta.actualizar(existentes[0].id, datosHerramienta);
                        } else {
                            await Herramienta.crear(datosHerramienta);
                        }
                    } else {
                        // MANUALES: Siempre crear nuevo registro para permitir múltiples
                        await Herramienta.crear(datosHerramienta);
                    }
                    procesados++;
                } catch (e) {
                    console.error(`Error en fila ${filaActual}:`, e);
                    omitidos.push(`Fila ${filaActual}: ${e.message}`);
                }
            }

            res.json({
                success: true,
                mensaje: `Importación de herramientas completa: ${procesados} registradas.`,
                alertas: omitidos.length > 0 ? omitidos : null
            });

        } catch (error) {
            console.error('Error importando herramientas:', error);
            res.status(500).json({ error: 'Error al procesar el archivo Excel' });
        }
    }
}

module.exports = ImportController;

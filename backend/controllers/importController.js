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
                    decreto_creacion: row.getCell(5).text?.trim()
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

                    if (existentes.length > 0) {
                        await Organizacion.actualizar(existentes[0].id, {
                            nombre: record.nombre,
                            tipo: tipoNorm,
                            siglas: record.siglas || '',
                            titular: record.titular || '',
                            decreto_creacion: record.decreto_creacion || '',
                            activo: 1
                        });
                    } else {
                        await Organizacion.crear({
                            nombre: record.nombre,
                            tipo: tipoNorm,
                            siglas: record.siglas || '',
                            titular: record.titular || '',
                            decreto_creacion: record.decreto_creacion || ''
                        });
                    }
                    procesados++;
                } catch (e) {
                    errores.push(`Fila ${records.indexOf(record) + 2}: ${e.message}`);
                }
            }

            res.json({
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
                    comentarios: row.getCell(7).text?.trim()
                });
            });

            let procesados = 0;
            let omitidos = [];
            const adminId = req.usuario.id;

            for (const item of tools) {
                if (!item.orgName || !item.link) continue;

                // 1. Buscar correspondencia de organización
                const { rows: orgs } = await db.query('SELECT id FROM organizaciones WHERE nombre = $1 OR siglas = $1', [item.orgName]);

                if (orgs.length === 0) {
                    omitidos.push(`Organización no encontrada: ${item.orgName}`);
                    continue;
                }

                const orgId = orgs[0].id;

                try {
                    // Validar tipo herramienta
                    const tipoMap = {
                        'ORGANIGRAMA': 'ORGANIGRAMA',
                        'REGLAMENTO': 'REGLAMENTO_INTERIOR',
                        'MANUAL DE ORGANIZACIÓN': 'MANUAL_ORGANIZACION',
                        'MANUAL DE PROCEDIMIENTOS': 'MANUAL_PROCEDIMIENTOS',
                        'MANUAL DE SERVICIOS': 'MANUAL_SERVICIOS'
                    };

                    let tipoFinal = 'MANUAL_ORGANIZACION'; // Default
                    for (const key in tipoMap) {
                        if (item.tipo?.toUpperCase().includes(key)) {
                            tipoFinal = tipoMap[key];
                            break;
                        }
                    }

                    await Herramienta.crear({
                        organizacion_id: orgId,
                        tipo_herramienta: tipoFinal,
                        nombre_archivo: `Importación masiva: ${tipoFinal}`,
                        ruta_archivo: item.link,
                        fecha_emision: item.fecha ? new Date(item.fecha) : new Date(),
                        estatus_poe: item.estatusPoe || 'PENDIENTE',
                        link_publicacion_poe: item.linkPoe || null,
                        comentarios: item.comentarios || 'Cargado vía Excel',
                        version: '1.0',
                        usuario_registro_id: adminId
                    });
                    procesados++;
                } catch (e) {
                    omitidos.push(`Error en registro ${item.orgName}: ${e.message}`);
                }
            }

            res.json({
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

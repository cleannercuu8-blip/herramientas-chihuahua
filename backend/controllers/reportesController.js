const ExcelJS = require('exceljs');
const Organizacion = require('../models/Organizacion');
const Herramienta = require('../models/Herramienta');
const Historial = require('../models/Historial');
const Expediente = require('../models/Expediente');
const ExpedienteAvance = require('../models/ExpedienteAvance');
const SemaforoService = require('../utils/semaforo');
const PDFDocument = require('pdfkit');
const db = require('../config/database');

/**
 * Controlador de reportes y exportaciones
 */
class ReportesController {

    /**
     * Exportar informe detallado de organización a PDF
     */
    static async exportarOrganizacionPDF(req, res) {
        const { id } = req.params;
        try {
            // Obtener datos de la organización
            const orgRes = await db.query('SELECT * FROM organizaciones WHERE id = $1', [id]);
            if (orgRes.rows.length === 0) {
                return res.status(404).json({ error: 'Organización no encontrada' });
            }
            const org = orgRes.rows[0];

            // Obtener herramientas
            const toolsRes = await db.query('SELECT * FROM herramientas WHERE organizacion_id = $1 ORDER BY tipo_herramienta', [id]);
            const herramientas = toolsRes.rows;

            // Crear documento PDF
            const doc = new PDFDocument({ margin: 50 });

            // Configurar respuesta
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Informe_${org.nombre.replace(/\s+/g, '_')}.pdf`);
            doc.pipe(res);

            // --- ENCABEZADO ---
            doc.fillColor('#003DA5').fontSize(20).text('SISTEMA DE HERRAMIENTAS ORGANIZACIONALES', { align: 'center' });
            doc.fontSize(14).text('Gobierno del Estado de Chihuahua', { align: 'center' });
            doc.moveDown();
            doc.strokeColor('#003DA5').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();

            // --- INFORMACIÓN GENERAL ---
            doc.fillColor('#333333').fontSize(16).text('Informe Detallado de la Dependencia/Entidad', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(12).fillColor('#000000');
            doc.text(`Nombre: ${org.nombre}`);
            doc.text(`Tipo: ${org.tipo}`);
            doc.text(`Titular: ${org.titular || 'No registrado'}`);
            doc.text(`Decreto de Creación: ${org.decreto_creacion || 'No registrado'}`);
            doc.moveDown();

            // --- RESUMEN DE CUMPLIMIENTO (SEMÁFORO) ---
            doc.fontSize(16).fillColor('#003DA5').text('Situación de Herramientas (Semáforo)');
            doc.moveDown(0.5);

            const labels = {
                'ORGANIGRAMA': 'Organigrama',
                'REGLAMENTO_ESTATUTO': 'Reglamento Interior / Estatuto Orgánico',
                'MANUAL_ORGANIZACION': 'Manual de Organización',
                'MANUAL_PROCEDIMIENTOS': 'Manual de Procedimientos',
                'MANUAL_SERVICIOS': 'Manual de Servicios'
            };

            herramientas.forEach(h => {
                const label = labels[h.tipo_herramienta] || h.tipo_herramienta;
                const status = (h.estatus_semaforo || 'rojo').toLowerCase();

                doc.fontSize(11).fillColor('#333333').text(`${label}: `, { continued: true });

                let color = '#EF4444';
                if (status === 'verde') color = '#10B981';
                if (status === 'amarillo') color = '#F59E0B';
                if (status === 'naranja') color = '#F97316';

                doc.fillColor(color).text(status.toUpperCase(), { continued: true });
                doc.fillColor('#666666').fontSize(9).text(`  (Act: ${h.fecha_actualizacion ? new Date(h.fecha_actualizacion).toLocaleDateString() : 'N/A'})`);
            });

            if (herramientas.length === 0) {
                doc.fillColor('#666666').text('No hay herramientas registradas para esta organización.');
            }
            doc.moveDown();

            // --- ESTADO DEL EXPEDIENTE ---
            // Buscar expediente asociado
            const expedientes = await Expediente.obtenerTodos({ organizacion_id: id });
            if (expedientes.length > 0) {
                const expediente = expedientes[0]; // Tomar el más reciente
                const avances = await ExpedienteAvance.obtenerPorExpediente(expediente.id);

                doc.fontSize(16).fillColor('#003DA5').text('Expediente de Reestructuración');
                doc.moveDown(0.5);

                // Tarjeta de resumen
                const startY = doc.y;
                doc.rect(50, startY, 500, 60).fillAndStroke('#F3F4F6', '#E5E7EB');

                doc.fontSize(12).fillColor('#000000').text(expediente.titulo, 60, startY + 10);
                doc.fontSize(10).fillColor('#666666').text(`Expediente: ${expediente.numero_expediente} | Estatus: ${expediente.estatus} | Prioridad: ${expediente.prioridad}`, 60, startY + 30);
                doc.text(`Progreso: ${expediente.porcentaje_progreso}%`, 450, startY + 30);

                doc.moveDown(4); // Ajustar según altura de tarjeta

                if (avances.length > 0) {
                    doc.fontSize(12).fillColor('#333333').text('Últimos Avances:');
                    doc.moveDown(0.5);

                    // Listar últimos 5 avances
                    avances.slice(0, 5).forEach(avance => {
                        doc.fontSize(10).fillColor('#000000').text(`• [${new Date(avance.fecha).toLocaleDateString()}] ${avance.titulo}`);
                        if (avance.descripcion) {
                            doc.fontSize(9).fillColor('#666666').text(`   ${avance.descripcion}`, { indent: 10 });
                        }
                        doc.moveDown(0.3);
                    });
                } else {
                    doc.fontSize(10).fillColor('#666666').text('No hay avances registrados en el expediente.');
                }
                doc.moveDown();
            }

            // --- DETALLE DE ARCHIVOS ---
            doc.fontSize(16).fillColor('#003DA5').text('Archivos y Documentación');
            doc.moveDown(0.5);

            herramientas.forEach((h, idx) => {
                doc.fontSize(11).fillColor('#000000').text(`${idx + 1}. ${labels[h.tipo_herramienta] || h.tipo_herramienta}`);
                doc.fontSize(10).fillColor('#666666');
                doc.text(`   Archivo: ${h.nombre_archivo || 'N/A'}`);
                doc.text(`   POE: ${h.fecha_publicacion_poe ? new Date(h.fecha_publicacion_poe).toLocaleDateString() : 'No publicado'}`);
                doc.moveDown(0.3);
            });

            doc.end();

        } catch (error) {
            console.error('Error al generar PDF:', error);
            console.error('Stack:', error.stack);

            // Si ya se empezó a enviar el PDF, no podemos enviar JSON
            if (!res.headersSent) {
                return res.status(500).json({
                    error: 'Error al generar el informe PDF',
                    details: error.message
                });
            }
        }
    }

    /**
     * Exportar inventario completo a Excel
     */
    static async exportarInventarioExcel(req, res) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Inventario de Herramientas');

            // Configurar columnas
            worksheet.columns = [
                { header: 'Organización', key: 'organizacion', width: 40 },
                { header: 'Tipo Org.', key: 'tipo_org', width: 20 },
                { header: 'Semáforo', key: 'semaforo', width: 12 },
                { header: 'Tipo Herramienta', key: 'tipo_herramienta', width: 25 },
                { header: 'Nombre Archivo', key: 'nombre_archivo', width: 40 },
                { header: 'Fecha Emisión', key: 'fecha_emision', width: 15 },
                { header: 'Fecha Actualización', key: 'fecha_actualizacion', width: 18 },
                { header: 'Publicado POE', key: 'fecha_poe', width: 15 },
                { header: 'Link POE', key: 'link_poe', width: 50 },
                { header: 'Versión', key: 'version', width: 10 }
            ];

            // Estilo de encabezado
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF003DA5' } // Azul institucional
            };

            // Obtener datos
            const organizaciones = await Organizacion.obtenerTodas();

            for (const org of organizaciones) {
                const herramientas = await Herramienta.obtenerPorOrganizacion(org.id);
                const semaforo = await SemaforoService.calcularEstatus(org.id, org.tipo);

                if (herramientas.length === 0) {
                    // Agregar fila aunque no tenga herramientas
                    worksheet.addRow({
                        organizacion: org.nombre,
                        tipo_org: org.tipo,
                        semaforo: semaforo.estatus,
                        tipo_herramienta: 'SIN HERRAMIENTAS',
                        nombre_archivo: '-',
                        fecha_emision: '-',
                        fecha_actualizacion: '-',
                        fecha_poe: '-',
                        link_poe: '-',
                        version: '-'
                    });
                } else {
                    herramientas.forEach(h => {
                        const row = worksheet.addRow({
                            organizacion: org.nombre,
                            tipo_org: org.tipo,
                            semaforo: semaforo.estatus,
                            tipo_herramienta: h.tipo_herramienta,
                            nombre_archivo: h.nombre_archivo,
                            fecha_emision: h.fecha_emision,
                            fecha_actualizacion: h.fecha_actualizacion,
                            fecha_poe: h.fecha_publicacion_poe || '-',
                            link_poe: h.link_publicacion_poe || '-',
                            version: h.version
                        });

                        // Colorear celda de semáforo
                        const semaforoCell = row.getCell('semaforo');
                        if (semaforo.estatus === 'VERDE') {
                            semaforoCell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FF10B981' }
                            };
                        } else if (semaforo.estatus === 'AMARILLO') {
                            semaforoCell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFF59E0B' }
                            };
                        } else {
                            semaforoCell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFEF4444' }
                            };
                        }
                        semaforoCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    });
                }
            }

            // Configurar respuesta
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=inventario-herramientas-${Date.now()}.xlsx`
            );

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error('Error al exportar inventario:', error);
            res.status(500).json({ error: 'Error al generar reporte' });
        }
    }

    /**
     * Exportar reporte de semáforo a Excel
     */
    static async exportarSemaforoExcel(req, res) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte de Semáforo');

            // Configurar columnas
            worksheet.columns = [
                { header: 'Organización', key: 'organizacion', width: 40 },
                { header: 'Tipo', key: 'tipo', width: 20 },
                { header: 'Semáforo', key: 'semaforo', width: 12 },
                { header: 'Total Herramientas', key: 'total_herramientas', width: 18 },
                { header: 'Observaciones', key: 'observaciones', width: 60 }
            ];

            // Estilo de encabezado
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF6B4C9A' } // Morado institucional
            };

            // Obtener datos
            const organizaciones = await Organizacion.obtenerTodas();

            for (const org of organizaciones) {
                const herramientas = await Herramienta.obtenerPorOrganizacion(org.id);
                const semaforo = await SemaforoService.calcularEstatus(org.id, org.tipo);

                const row = worksheet.addRow({
                    organizacion: org.nombre,
                    tipo: org.tipo,
                    semaforo: semaforo.estatus,
                    total_herramientas: herramientas.length,
                    observaciones: semaforo.detalles.mensaje
                });

                // Colorear celda de semáforo
                const semaforoCell = row.getCell('semaforo');
                if (semaforo.estatus === 'VERDE') {
                    semaforoCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF10B981' }
                    };
                } else if (semaforo.estatus === 'AMARILLO') {
                    semaforoCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF59E0B' }
                    };
                } else {
                    semaforoCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFEF4444' }
                    };
                }
                semaforoCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }

            // Configurar respuesta
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=reporte-semaforo-${Date.now()}.xlsx`
            );

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error('Error al exportar semáforo:', error);
            res.status(500).json({ error: 'Error al generar reporte' });
        }
    }

    /**
     * Exportar herramientas próximas a vencer
     */
    static async exportarProximasVencerExcel(req, res) {
        try {
            const { meses } = req.query;
            const mesesVencimiento = meses ? parseInt(meses) : 12;

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Herramientas Próximas a Vencer');

            // Configurar columnas
            worksheet.columns = [
                { header: 'Organización', key: 'organizacion', width: 40 },
                { header: 'Tipo Herramienta', key: 'tipo_herramienta', width: 25 },
                { header: 'Nombre Archivo', key: 'nombre_archivo', width: 40 },
                { header: 'Fecha Actualización', key: 'fecha_actualizacion', width: 18 },
                { header: 'Meses Sin Actualizar', key: 'meses', width: 20 },
                { header: 'Prioridad', key: 'prioridad', width: 12 }
            ];

            // Estilo de encabezado
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEF4444' } // Rojo
            };

            // Obtener datos
            const herramientas = await Herramienta.obtenerProximasAVencer(mesesVencimiento);

            herramientas.forEach(h => {
                const fechaActualizacion = new Date(h.fecha_actualizacion);
                const hoy = new Date();
                const mesesSinActualizar = Math.floor(
                    (hoy - fechaActualizacion) / (1000 * 60 * 60 * 24 * 30.44)
                );

                let prioridad = 'MEDIA';
                if (mesesSinActualizar > 24) prioridad = 'ALTA';
                if (mesesSinActualizar > 36) prioridad = 'CRÍTICA';

                const row = worksheet.addRow({
                    organizacion: h.organizacion_nombre,
                    tipo_herramienta: h.tipo_herramienta,
                    nombre_archivo: h.nombre_archivo,
                    fecha_actualizacion: h.fecha_actualizacion,
                    meses: mesesSinActualizar,
                    prioridad
                });

                // Colorear prioridad
                const prioridadCell = row.getCell('prioridad');
                if (prioridad === 'CRÍTICA') {
                    prioridadCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFEF4444' }
                    };
                    prioridadCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                } else if (prioridad === 'ALTA') {
                    prioridadCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF59E0B' }
                    };
                    prioridadCell.font = { bold: true };
                }
            });

            // Configurar respuesta
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=herramientas-proximas-vencer-${Date.now()}.xlsx`
            );

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error('Error al exportar próximas a vencer:', error);
            res.status(500).json({ error: 'Error al generar reporte' });
        }
    }

    /**
     * Obtener historial de cambios
     */
    static async obtenerHistorial(req, res) {
        try {
            const { limite } = req.query;
            const limiteRegistros = limite ? parseInt(limite) : 100;

            const historial = await Historial.obtenerTodos(limiteRegistros);

            res.json({ historial });

        } catch (error) {
            console.error('Error al obtener historial:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }
}

module.exports = ReportesController;

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
            const orgRes = await db.query('SELECT * FROM organizaciones WHERE id = $1', [id]);
            if (orgRes.rows.length === 0) {
                return res.status(404).json({ error: 'Organización no encontrada' });
            }
            const org = orgRes.rows[0];
            const toolsRes = await db.query('SELECT * FROM herramientas WHERE organizacion_id = $1 ORDER BY tipo_herramienta', [id]);
            const herramientas = toolsRes.rows;

            const doc = new PDFDocument({ margin: 50, bufferPages: true });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=Informe_${org.nombre.replace(/\s+/g, '_')}.pdf`);
            doc.pipe(res);

            // --- PORTADA ---
            doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFFFFF');
            doc.rect(0, 0, doc.page.width, 150).fill('#003DA5');
            doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('SISTEMA DE HERRAMIENTAS', 50, 50);
            doc.text('ORGANIZACIONALES', 50, 80);
            doc.fontSize(10).font('Helvetica').text('GOBIERNO DEL ESTADO DE CHIHUAHUA', 50, 115);

            doc.fillColor('#334155').fontSize(14).font('Helvetica-Bold').text('INFORME TÉCNICO DE CUMPLIMIENTO', 50, 280);
            doc.rect(50, 305, 50, 3).fill('#003DA5');

            doc.moveDown(4);
            doc.fontSize(26).font('Helvetica-Bold').fillColor('#003DA5').text(org.nombre.toUpperCase(), { width: 500 });

            doc.moveDown(1.5);
            doc.fontSize(12).font('Helvetica').fillColor('#64748B').text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}`);
            doc.text(`TIPO: ${org.tipo.replace('_', ' ')}`);

            doc.rect(0, doc.page.height - 80, doc.page.width, 80).fill('#6B4C9A');
            doc.fillColor('#FFFFFF').fontSize(10).text('COORDINACIÓN DE MODERNIZACIÓN ADMINISTRATIVA', 50, doc.page.height - 45);

            // --- CONTENIDO ---
            doc.addPage();

            // Función para dibujar encabezado en cada página
            const drawHeader = () => {
                doc.rect(0, 0, doc.page.width, 40).fill('#F1F5F9');
                doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('SISTEMA DE HERRAMIENTAS ORGANIZACIONALES | GOBIERNO DEL ESTADO DE CHIHUAHUA', 50, 15);
                doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(50, 40).lineTo(doc.page.width - 50, 40).stroke();
            };

            drawHeader();
            doc.moveDown(2);

            // Sección 1: Información General
            doc.fillColor('#003DA5').fontSize(16).font('Helvetica-Bold').text('1. INFORMACIÓN GENERAL');
            doc.moveDown(1);

            // Caja de información
            const startY = doc.y;
            doc.rect(50, startY, 500, 90).fill('#F8FAFC');
            doc.strokeColor('#E2E8F0').lineWidth(1).rect(50, startY, 500, 90).stroke();

            doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold');
            doc.text('TITULAR:', 70, startY + 15);
            doc.font('Helvetica').text(org.titular || 'NO REGISTRADO', 150, startY + 15);

            doc.font('Helvetica-Bold').text('SIGLAS:', 70, startY + 35);
            doc.font('Helvetica').text(org.siglas || 'N/A', 150, startY + 35);

            doc.font('Helvetica-Bold').text('NATURALEZA:', 70, startY + 55);
            doc.font('Helvetica').text(org.tipo, 150, startY + 55);

            doc.moveDown(4);

            // Sección 2: Semáforo de Cumplimiento
            doc.fillColor('#003DA5').fontSize(16).font('Helvetica-Bold').text('2. ESTADO DE CUMPLIMIENTO');
            doc.moveDown(1);

            const labels = {
                'ORGANIGRAMA': 'Organigrama',
                'REGLAMENTO_ESTATUTO': 'Reglamento Interior / Estatuto Orgánico',
                'MANUAL_ORGANIZACION': 'Manual de Organización',
                'MANUAL_PROCEDIMIENTOS': 'Manual de Procedimientos',
                'MANUAL_SERVICIOS': 'Manual de Servicios'
            };

            // Dibujar tabla de semáforo
            const tableTop = doc.y;
            doc.fillColor('#003DA5').rect(50, tableTop, 500, 20).fill();
            doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
            doc.text('HERRAMIENTA', 60, tableTop + 6);
            doc.text('ESTATUS', 300, tableTop + 6);
            doc.text('ÚLTIMA ACTUALIZACIÓN', 400, tableTop + 6);

            let currentTableY = tableTop + 20;

            const tipos = ['ORGANIGRAMA', 'REGLAMENTO_ESTATUTO', 'MANUAL_ORGANIZACION', 'MANUAL_PROCEDIMIENTOS', 'MANUAL_SERVICIOS'];

            tipos.forEach((tipo, i) => {
                const item = herramientas.find(h => h.tipo_herramienta === tipo);
                const status = (item?.estatus_semaforo || 'ROJO').toUpperCase();

                // Fondo alternado
                if (i % 2 === 0) doc.fillColor('#F1F5F9').rect(50, currentTableY, 500, 25).fill();

                doc.fillColor('#334155').fontSize(9).font('Helvetica');
                doc.text(labels[tipo], 60, currentTableY + 8);

                // Color del estatus
                let statusColor = '#EF4444';
                if (status === 'VERDE') statusColor = '#10B981';
                if (status === 'AMARILLO') statusColor = '#F59E0B';
                if (status === 'NARANJA') statusColor = '#F97316';

                doc.fillColor(statusColor).font('Helvetica-Bold').text(status, 300, currentTableY + 8);
                doc.fillColor('#64748B').font('Helvetica').text(item?.fecha_actualizacion ? new Date(item.fecha_actualizacion).toLocaleDateString() : 'SIN DATOS', 400, currentTableY + 8);

                currentTableY += 25;
            });

            doc.y = currentTableY + 30;

            // Sección 3: Datos de Expediente
            try {
                const expedientes = await Expediente.obtenerTodos({ organizacion_id: id });
                if (expedientes && expedientes.length > 0) {
                    const exp = expedientes[0];
                    if (doc.y > 600) { doc.addPage(); drawHeader(); doc.moveDown(2); }

                    doc.fillColor('#003DA5').fontSize(16).font('Helvetica-Bold').text('3. EXPEDIENTE DE SEGUIMIENTO');
                    doc.moveDown(1);

                    doc.fillColor('#334155').fontSize(11).font('Helvetica-Bold').text(`TÍTULO: ${exp.titulo || 'SIN TÍTULO'}`);
                    doc.fontSize(10).font('Helvetica').text(`No. Expediente: ${exp.numero_expediente || 'N/A'} | Estatus: ${exp.estatus}`);

                    // Barra de progreso
                    doc.moveDown(0.5);
                    const progX = doc.x;
                    const progY = doc.y;
                    doc.rect(progX, progY, 300, 15).fill('#E2E8F0');
                    doc.rect(progX, progY, (exp.porcentaje_progreso || 0) * 3, 15).fill('#003DA5');
                    doc.fillColor('#FFFFFF').fontSize(8).text(`${exp.porcentaje_progreso || 0}%`, progX + 140, progY + 4);
                    doc.moveDown(2);
                }
            } catch (err) { /* Ignorar error de carga secundaria */ }

            // Footer con numeración
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                if (i > 0) { // No poner footer en la portada
                    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica').text(
                        `Página ${i + 1} de ${pages.count} | Generado el ${new Date().toLocaleString()}`,
                        50, doc.page.height - 30, { align: 'center' }
                    );
                }
            }

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

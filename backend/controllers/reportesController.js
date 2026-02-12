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

            const doc = new PDFDocument({
                margin: 50,
                bufferPages: true,
                autoFirstPage: false
            });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=Informe_${org.nombre.replace(/\s+/g, '_')}.pdf`);
            doc.pipe(res);

            // Generar informe individual
            await ReportesController._generarPaginaPortada(doc, org.nombre, org.tipo);
            await ReportesController._generarContenidoReporte(doc, org, herramientas);

            // Numeración de páginas
            ReportesController._agregarNumeracionPaginas(doc);

            doc.end();
        } catch (error) {
            console.error('Error al generar PDF individual:', error);
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Error al generar el informe PDF' });
            }
        }
    }

    /**
     * Exportar informe masivo por sector a PDF
     */
    static async exportarSectorPDF(req, res) {
        const { tipo } = req.params;
        try {
            // Normalizar tipo
            let tipoDB = tipo.toUpperCase();
            if (tipo === 'centralizado') tipoDB = 'DEPENDENCIA';
            if (tipo === 'paraestatal') tipoDB = 'ENTIDAD_PARAESTATAL';
            if (tipo === 'autonomo') tipoDB = 'ORGANISMO_AUTONOMO';

            const titulosPortada = {
                'DEPENDENCIA': 'REPORTE GENERAL DE LAS DEPENDENCIAS',
                'ENTIDAD_PARAESTATAL': 'REPORTE GENERAL DE LAS ENTIDADES',
                'ORGANISMO_AUTONOMO': 'REPORTE GENERAL DE LOS ORGANISMOS AUTÓNOMOS'
            };

            const tituloGeneral = titulosPortada[tipoDB] || 'REPORTE GENERAL POR SECTOR';

            const orgsRes = await db.query('SELECT * FROM organizaciones WHERE tipo = $1 AND activo = 1 ORDER BY nombre ASC', [tipoDB]);
            const organizaciones = orgsRes.rows;

            if (organizaciones.length === 0) {
                return res.status(404).json({ error: 'No se encontraron organizaciones en este sector' });
            }

            const doc = new PDFDocument({
                margin: 50,
                bufferPages: true,
                autoFirstPage: false
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=Reporte_General_${tipo}.pdf`);
            doc.pipe(res);

            // --- PORTADA GENERAL DEL SECTOR ---
            doc.addPage({ margin: 0 });
            doc.save();
            doc.rect(0, 0, doc.page.width, 150).fill('#003DA5');
            doc.restore();

            doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('SISTEMA DE HERRAMIENTAS', 50, 50);
            doc.text('ORGANIZACIONALES', 50, 80);
            doc.fontSize(10).font('Helvetica').text('GOBIERNO DEL ESTADO DE CHIHUAHUA', 50, 115);

            doc.fillColor('#334155').fontSize(16).font('Helvetica-Bold').text(tituloGeneral, 50, 240);
            doc.save();
            doc.rect(50, 265, 50, 3).fill('#003DA5');
            doc.restore();

            doc.fontSize(12).font('Helvetica').fillColor('#64748B').text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}`, 50, 380);

            doc.save();
            doc.rect(0, doc.page.height - 80, doc.page.width, 80).fill('#6B4C9A');
            doc.restore();
            doc.fillColor('#FFFFFF').fontSize(10).text('COORDINACIÓN DE MODERNIZACIÓN ADMINISTRATIVA', 50, doc.page.height - 45);

            // --- GENERAR CADA REPORTE ---
            for (const org of organizaciones) {
                const toolsRes = await db.query('SELECT * FROM herramientas WHERE organizacion_id = $1 ORDER BY tipo_herramienta', [org.id]);
                const herramientas = toolsRes.rows;

                // Portada de cada organización (técnica)
                await ReportesController._generarPaginaPortada(doc, org.nombre, org.tipo);
                // Contenido
                await ReportesController._generarContenidoReporte(doc, org, herramientas);
            }

            // Numeración de páginas global
            ReportesController._agregarNumeracionPaginas(doc);

            doc.end();
        } catch (error) {
            console.error('Error al generar PDF masivo:', error);
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Error al generar el reporte masivo' });
            }
        }
    }

    // --- MÉTODOS PRIVADOS DE APOYO PARA PDF ---

    static async _generarPaginaPortada(doc, nombreOrg, tipoOrg) {
        doc.addPage({ margin: 0 });
        doc.save();
        doc.rect(0, 0, doc.page.width, 150).fill('#003DA5');
        doc.restore();

        doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('SISTEMA DE HERRAMIENTAS', 50, 50);
        doc.text('ORGANIZACIONALES', 50, 80);
        doc.fontSize(10).font('Helvetica').text('GOBIERNO DEL ESTADO DE CHIHUAHUA', 50, 115);

        doc.fillColor('#334155').fontSize(14).font('Helvetica-Bold').text('INFORME TÉCNICO DE CUMPLIMIENTO', 50, 240);
        doc.save();
        doc.rect(50, 265, 50, 3).fill('#003DA5');
        doc.restore();

        doc.fontSize(24).font('Helvetica-Bold').fillColor('#003DA5').text(nombreOrg.toUpperCase(), 50, 300, { width: 500 });

        doc.fontSize(12).font('Helvetica').fillColor('#64748B').text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}`, 50, 380);
        doc.text(`TIPO: ${tipoOrg.replace('_', ' ')}`, 50, 400);

        doc.save();
        doc.rect(0, doc.page.height - 80, doc.page.width, 80).fill('#6B4C9A');
        doc.restore();
        doc.fillColor('#FFFFFF').fontSize(10).text('COORDINACIÓN DE MODERNIZACIÓN ADMINISTRATIVA', 50, doc.page.height - 45);
    }

    static async _generarContenidoReporte(doc, org, herramientas) {
        doc.addPage({
            margin: { top: 50, bottom: 20, left: 50, right: 50 }
        });

        const drawHeader = () => {
            doc.save();
            doc.rect(0, 0, doc.page.width, 40).fill('#F1F5F9');
            doc.restore();
            doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('SISTEMA DE HERRAMIENTAS ORGANIZACIONALES | GOBIERNO DEL ESTADO DE CHIHUAHUA', 50, 15);
            doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(50, 40).lineTo(doc.page.width - 50, 40).stroke();
        };

        drawHeader();
        doc.moveDown(2);

        // Sección 1: Información General
        doc.fillColor('#003DA5').fontSize(16).font('Helvetica-Bold').text('1. INFORMACIÓN GENERAL');
        doc.moveDown(1);

        const infoY = doc.y;
        doc.save();
        doc.rect(50, infoY, 500, 90).fill('#F8FAFC');
        doc.strokeColor('#E2E8F0').lineWidth(1).rect(50, infoY, 500, 90).stroke();
        doc.restore();

        doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold');
        doc.text('TITULAR:', 70, infoY + 15);
        doc.font('Helvetica').text(org.titular || 'NO REGISTRADO', 150, infoY + 15);
        doc.font('Helvetica-Bold').text('SIGLAS:', 70, infoY + 35);
        doc.font('Helvetica').text(org.siglas || 'N/A', 150, infoY + 35);
        doc.font('Helvetica-Bold').text('NATURALEZA:', 70, infoY + 55);
        doc.font('Helvetica').text(org.tipo.replace(/_/g, ' '), 150, infoY + 55);

        doc.moveDown(5);

        // Sección 2: Semáforo de Cumplimiento
        doc.fillColor('#003DA5').fontSize(16).font('Helvetica-Bold').text('2. ESTADO DE CUMPLIMIENTO');
        doc.moveDown(1);

        const labels = {
            'ORGANIGRAMA': 'Organigrama',
            'REGLAMENTO_ESTATUTO': 'Reglamento / Estatuto',
            'MANUAL_ORGANIZACION': 'Manual de Org.',
            'MANUAL_PROCEDIMIENTOS': 'Manual de Proc.',
            'MANUAL_SERVICIOS': 'Manual de Serv.'
        };

        const tableTop = doc.y;
        doc.save();
        doc.fillColor('#003DA5').rect(50, tableTop, 500, 20).fill();
        doc.restore();

        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        doc.text('HERRAMIENTA', 60, tableTop + 6);
        doc.text('ESTATUS', 190, tableTop + 6);
        doc.text('EMISIÓN', 270, tableTop + 6);
        doc.text('PUBL. POE', 360, tableTop + 6);
        doc.text('ACTUALIZACIÓN', 450, tableTop + 6);

        let currentTableY = tableTop + 20;

        // Todos los tipos a mostrar (Manual de servicios condicional)
        const tiposBase = ['ORGANIGRAMA', 'REGLAMENTO_ESTATUTO', 'MANUAL_ORGANIZACION', 'MANUAL_PROCEDIMIENTOS'];
        if (org.requiere_manual_servicios) {
            tiposBase.push('MANUAL_SERVICIOS');
        }

        tiposBase.forEach((tipo, i) => {
            const item = herramientas.find(h => h.tipo_herramienta === tipo);

            let statusText = 'ROJO';
            let statusColor = '#EF4444';

            if (item) {
                const año = new Date(item.fecha_emision).getFullYear();
                if (año >= 2022) {
                    statusText = 'VERDE';
                    statusColor = '#10B981';
                } else if (año >= 2018) {
                    statusText = 'AMARILLO';
                    statusColor = '#F59E0B';
                }
            }

            if (i % 2 === 0) {
                doc.save();
                doc.fillColor('#F1F5F9').rect(50, currentTableY, 500, 25).fill();
                doc.restore();
            }

            doc.fillColor('#334155').fontSize(8).font('Helvetica');
            doc.text(labels[tipo], 60, currentTableY + 8);

            doc.fillColor(statusColor).font('Helvetica-Bold').text(statusText, 190, currentTableY + 8);

            doc.fillColor('#64748B').font('Helvetica');
            doc.text(item?.fecha_emision ? new Date(item.fecha_emision).toLocaleDateString() : 'N/A', 270, currentTableY + 8);
            doc.text(item?.fecha_publicacion_poe ? new Date(item.fecha_publicacion_poe).toLocaleDateString() : 'N/A', 360, currentTableY + 8);
            doc.text(item?.fecha_actualizacion ? new Date(item.fecha_actualizacion).toLocaleDateString() : 'N/A', 450, currentTableY + 8);

            currentTableY += 25;
        });

        doc.y = currentTableY + 30;

        try {
            const expedientes = await Expediente.obtenerTodos({ organizacion_id: org.id });
            if (expedientes && expedientes.length > 0) {
                const exp = expedientes[0];
                if (doc.y > 600) {
                    doc.addPage({ margin: { top: 50, bottom: 20, left: 50, right: 50 } });
                    drawHeader();
                    doc.moveDown(2);
                }
                doc.fillColor('#003DA5').fontSize(16).font('Helvetica-Bold').text('3. EXPEDIENTE DE SEGUIMIENTO');
                doc.moveDown(1);
                doc.fillColor('#334155').fontSize(11).font('Helvetica-Bold').text(`TÍTULO: ${exp.titulo || 'SIN TÍTULO'}`);
                doc.fontSize(10).font('Helvetica').text(`No. Expediente: ${exp.numero_expediente || 'N/A'} | Estatus: ${exp.estatus}`);
                doc.moveDown(0.5);
                const progX = doc.x;
                const progY = doc.y;
                doc.save();
                doc.rect(progX, progY, 300, 15).fill('#E2E8F0');
                doc.rect(progX, progY, (exp.porcentaje_progreso || 0) * 3, 15).fill('#003DA5');
                doc.restore();
                doc.fillColor('#FFFFFF').fontSize(8).text(`${exp.porcentaje_progreso || 0}%`, progX + 140, progY + 4);
            }
        } catch (err) { }
    }

    static _agregarNumeracionPaginas(doc) {
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            if (i > 0) {
                doc.fillColor('#94A3B8').fontSize(8).font('Helvetica');
                doc.text(
                    `Página ${i + 1} de ${pages.count} | Generado el ${new Date().toLocaleString()}`,
                    50, doc.page.height - 30, {
                    align: 'center',
                    lineBreak: false
                }
                );
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
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003DA5' } };
            const organizaciones = await Organizacion.obtenerTodas();
            for (const org of organizaciones) {
                const herramientas = await Herramienta.obtenerPorOrganizacion(org.id);
                const semaforo = await SemaforoService.calcularEstatus(org.id, org.tipo);

                // Tipos de herramientas esperados
                const tiposEsperados = ['ORGANIGRAMA', 'REGLAMENTO_ESTATUTO', 'MANUAL_ORGANIZACION', 'MANUAL_PROCEDIMIENTOS'];
                if (org.requiere_manual_servicios) {
                    tiposEsperados.push('MANUAL_SERVICIOS');
                }

                tiposEsperados.forEach(tipo => {
                    const h = herramientas.find(item => item.tipo_herramienta === tipo);
                    const row = worksheet.addRow({
                        organizacion: org.nombre,
                        tipo_org: org.tipo,
                        semaforo: semaforo.estatus,
                        tipo_herramienta: tipo,
                        nombre_archivo: h ? h.nombre_archivo : 'FALTA',
                        fecha_emision: h ? h.fecha_emision : '-',
                        fecha_actualizacion: h ? h.fecha_actualizacion : '-',
                        fecha_poe: h ? (h.fecha_publicacion_poe || '-') : '-',
                        link_poe: h ? (h.link_publicacion_poe || '-') : '-',
                        version: h ? h.version : '-'
                    });
                    const semaforoCell = row.getCell('semaforo');
                    if (semaforo.estatus === 'VERDE') {
                        semaforoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
                    } else if (semaforo.estatus === 'AMARILLO') {
                        semaforoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
                    } else {
                        semaforoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
                    }
                    semaforoCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                });
            }
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=inventario-herramientas-${Date.now()}.xlsx`);
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
            worksheet.columns = [
                { header: 'Organización', key: 'organizacion', width: 40 },
                { header: 'Tipo', key: 'tipo', width: 20 },
                { header: 'Semáforo', key: 'semaforo', width: 12 },
                { header: 'Requiere Manual Serv.', key: 'requiere_manual', width: 20 },
                { header: 'Observaciones', key: 'observaciones', width: 60 }
            ];
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B4C9A' } };
            const organizaciones = await Organizacion.obtenerTodas();
            for (const org of organizaciones) {
                const semaforo = await SemaforoService.calcularEstatus(org.id, org.tipo);
                const row = worksheet.addRow({
                    organizacion: org.nombre,
                    tipo: org.tipo,
                    semaforo: semaforo.estatus,
                    requiere_manual: org.requiere_manual_servicios ? 'SÍ' : 'NO',
                    observaciones: semaforo.detalles.mensaje
                });
                const semaforoCell = row.getCell('semaforo');
                if (semaforo.estatus === 'VERDE') {
                    semaforoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
                } else if (semaforo.estatus === 'AMARILLO') {
                    semaforoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
                } else {
                    semaforoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
                }
                semaforoCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=reporte-semaforo-${Date.now()}.xlsx`);
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
            worksheet.columns = [
                { header: 'Organización', key: 'organizacion', width: 40 },
                { header: 'Tipo Herramienta', key: 'tipo_herramienta', width: 25 },
                { header: 'Nombre Archivo', key: 'nombre_archivo', width: 40 },
                { header: 'Fecha Actualización', key: 'fecha_actualizacion', width: 18 },
                { header: 'Meses Sin Actualizar', key: 'meses', width: 20 },
                { header: 'Prioridad', key: 'prioridad', width: 12 }
            ];
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
            const herramientas = await Herramienta.obtenerProximasAVencer(mesesVencimiento);
            herramientas.forEach(h => {
                const fechaActualizacion = new Date(h.fecha_actualizacion);
                const hoy = new Date();
                const mesesSinActualizar = Math.floor((hoy - fechaActualizacion) / (1000 * 60 * 60 * 24 * 30.44));
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
                const prioridadCell = row.getCell('prioridad');
                if (prioridad === 'CRÍTICA') {
                    prioridadCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
                    prioridadCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                } else if (prioridad === 'ALTA') {
                    prioridadCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
                    prioridadCell.font = { bold: true };
                }
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=herramientas-proximas-vencer-${Date.now()}.xlsx`);
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

const ExcelJS = require('exceljs');
const Organizacion = require('../models/Organizacion');
const Herramienta = require('../models/Herramienta');
const Historial = require('../models/Historial');
const SemaforoService = require('../utils/semaforo');

/**
 * Controlador de reportes y exportaciones
 */
class ReportesController {

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

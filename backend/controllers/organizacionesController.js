const Organizacion = require('../models/Organizacion');
const Herramienta = require('../models/Herramienta');
const SemaforoService = require('../utils/semaforo');

/**
 * Controlador de organizaciones
 */
class OrganizacionesController {

    /**
     * Obtener todas las organizaciones con su estatus de semáforo
     */
    static async obtenerTodas(req, res) {
        try {
            const { tipo } = req.query;

            let organizaciones;
            if (tipo) {
                organizaciones = await Organizacion.obtenerPorTipo(tipo);
            } else {
                organizaciones = await Organizacion.obtenerTodas();
            }

            // Calcular estatus de semáforo para cada organización
            const organizacionesConSemaforo = await Promise.all(
                organizaciones.map(async (org) => {
                    const semaforo = await SemaforoService.calcularEstatus(org.id, org.tipo);
                    return {
                        ...org,
                        semaforo: semaforo.estatus,
                        detalles_semaforo: semaforo.detalles
                    };
                })
            );

            res.json({ organizaciones: organizacionesConSemaforo });

        } catch (error) {
            console.error('Error al obtener organizaciones:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Obtener una organización por ID
     */
    static async obtenerPorId(req, res) {
        try {
            const { id } = req.params;

            const organizacion = await Organizacion.obtenerPorId(id);

            if (!organizacion) {
                return res.status(404).json({ error: 'Organización no encontrada' });
            }

            // Obtener herramientas de la organización
            const herramientas = await Herramienta.obtenerPorOrganizacion(id);

            // Calcular semáforo
            const semaforo = await SemaforoService.calcularEstatus(id, organizacion.tipo);

            res.json({
                organizacion: {
                    ...organizacion,
                    herramientas,
                    semaforo: semaforo.estatus,
                    detalles_semaforo: semaforo.detalles
                }
            });

        } catch (error) {
            console.error('Error al obtener organización:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Crear nueva organización
     */
    static async crear(req, res) {
        try {
            const { nombre, tipo, siglas } = req.body;

            if (!nombre || !tipo) {
                return res.status(400).json({
                    error: 'Nombre y tipo son requeridos'
                });
            }

            const tiposValidos = ['DEPENDENCIA', 'ENTIDAD_PARAESTATAL'];
            if (!tiposValidos.includes(tipo)) {
                return res.status(400).json({
                    error: 'Tipo inválido',
                    tiposValidos
                });
            }

            const nuevaOrganizacion = await Organizacion.crear({
                nombre,
                tipo,
                siglas: siglas || null,
                titular: req.body.titular || null,
                decreto_creacion: req.body.decreto_creacion || null
            });

            res.status(201).json({
                mensaje: 'Organización creada exitosamente',
                organizacion: nuevaOrganizacion
            });

        } catch (error) {
            console.error('Error al crear organización:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Actualizar organización
     */
    static async actualizar(req, res) {
        try {
            const { id } = req.params;
            const { nombre, tipo, siglas, activo, titular, decreto_creacion } = req.body;

            const organizacion = await Organizacion.obtenerPorId(id);

            if (!organizacion) {
                return res.status(404).json({ error: 'Organización no encontrada' });
            }

            const resultado = await Organizacion.actualizar(id, {
                nombre: nombre || organizacion.nombre,
                tipo: tipo || organizacion.tipo,
                siglas: siglas !== undefined ? siglas : organizacion.siglas,
                titular: titular !== undefined ? titular : organizacion.titular,
                decreto_creacion: decreto_creacion !== undefined ? decreto_creacion : organizacion.decreto_creacion,
                activo: activo !== undefined ? activo : organizacion.activo
            });

            res.json({
                mensaje: 'Organización actualizada exitosamente',
                cambios: resultado.changes
            });

        } catch (error) {
            console.error('Error al actualizar organización:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Eliminar organización (soft delete)
     */
    static async eliminar(req, res) {
        try {
            const { id } = req.params;

            const organizacion = await Organizacion.obtenerPorId(id);

            if (!organizacion) {
                return res.status(404).json({ error: 'Organización no encontrada' });
            }

            await Organizacion.eliminar(id);

            res.json({ mensaje: 'Organización eliminada exitosamente' });

        } catch (error) {
            console.error('Error al eliminar organización:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Obtener estadísticas de semáforo
     */
    static async obtenerEstadisticas(req, res) {
        try {
            const organizaciones = await Organizacion.obtenerTodas();

            const estadisticas = {
                total: organizaciones.length,
                verde: 0,
                amarillo: 0,
                rojo: 0,
                porTipo: {
                    DEPENDENCIA: { total: 0, verde: 0, amarillo: 0, rojo: 0 },
                    ENTIDAD_PARAESTATAL: { total: 0, verde: 0, amarillo: 0, rojo: 0 }
                }
            };

            for (const org of organizaciones) {
                const semaforo = await SemaforoService.calcularEstatus(org.id, org.tipo);

                estadisticas[semaforo.estatus.toLowerCase()]++;
                estadisticas.porTipo[org.tipo].total++;
                estadisticas.porTipo[org.tipo][semaforo.estatus.toLowerCase()]++;
            }

            res.json({ estadisticas });

        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }
}

module.exports = OrganizacionesController;

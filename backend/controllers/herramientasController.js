const Herramienta = require('../models/Herramienta');
const Historial = require('../models/Historial');
const SemaforoService = require('../utils/semaforo');
const path = require('path');
const fs = require('fs');

/**
 * Controlador de herramientas organizacionales
 */
class HerramientasController {

    /**
     * Obtener todas las herramientas
     */
    static async obtenerTodas(req, res) {
        try {
            const { organizacion_id, tipo_herramienta } = req.query;

            let herramientas;

            if (organizacion_id) {
                herramientas = await Herramienta.obtenerPorOrganizacion(organizacion_id);
            } else {
                herramientas = await Herramienta.obtenerTodas();
            }

            // Filtrar por tipo si se especifica
            if (tipo_herramienta) {
                herramientas = herramientas.filter(h => h.tipo_herramienta === tipo_herramienta);
            }

            res.json({ herramientas });

        } catch (error) {
            console.error('Error al obtener herramientas:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Obtener una herramienta por ID
     */
    static async obtenerPorId(req, res) {
        try {
            const { id } = req.params;

            const herramienta = await Herramienta.obtenerPorId(id);

            if (!herramienta) {
                return res.status(404).json({ error: 'Herramienta no encontrada' });
            }

            // Obtener historial
            const historial = await Historial.obtenerPorHerramienta(id);

            res.json({
                herramienta,
                historial
            });

        } catch (error) {
            console.error('Error al obtener herramienta:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Crear nueva herramienta con archivo
     */
    static async crear(req, res) {
        try {
            const {
                organizacion_id,
                tipo_herramienta,
                fecha_emision,
                fecha_publicacion_poe,
                link_publicacion_poe,
                version
            } = req.body;

            // Validaciones
            if (!organizacion_id || !tipo_herramienta || !fecha_emision) {
                return res.status(400).json({
                    error: 'organizacion_id, tipo_herramienta y fecha_emision son requeridos'
                });
            }

            // Si no hay archivo, el link es obligatorio
            if (!req.file && !link_publicacion_poe) {
                return res.status(400).json({
                    error: 'Debe subir un archivo o proporcionar un link de consulta'
                });
            }

            const tiposValidos = [
                'ORGANIGRAMA',
                'REGLAMENTO_INTERIOR',
                'ESTATUTO_ORGANICO',
                'MANUAL_ORGANIZACION',
                'MANUAL_PROCEDIMIENTOS',
                'MANUAL_SERVICIOS'
            ];

            if (!tiposValidos.includes(tipo_herramienta)) {
                return res.status(400).json({
                    error: 'Tipo de herramienta inválido',
                    tiposValidos
                });
            }

            // Crear herramienta
            const nuevaHerramienta = await Herramienta.crear({
                organizacion_id,
                tipo_herramienta,
                nombre_archivo: req.file ? req.file.originalname : 'Documento en línea',
                ruta_archivo: req.file ? req.file.path : link_publicacion_poe,
                fecha_emision,
                fecha_publicacion_poe: fecha_publicacion_poe || fecha_emision, // Sincronizar fechas por defecto
                link_publicacion_poe: link_publicacion_poe || null,
                version: version || '1.0',
                usuario_registro_id: req.usuario.id
            });

            // Registrar en historial
            await Historial.registrar({
                herramienta_id: nuevaHerramienta.id,
                usuario_id: req.usuario.id,
                accion: 'CREACION',
                descripcion: `Creación de ${tipo_herramienta} - ${req.file.originalname}`
            });

            // Actualizar caché de semáforo
            await SemaforoService.actualizarCacheSemaforo(organizacion_id);

            res.status(201).json({
                mensaje: 'Herramienta creada exitosamente',
                herramienta: nuevaHerramienta
            });

        } catch (error) {
            console.error('Error al crear herramienta:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Actualizar herramienta
     */
    static async actualizar(req, res) {
        try {
            const { id } = req.params;
            const {
                tipo_herramienta,
                fecha_emision,
                fecha_publicacion_poe,
                link_publicacion_poe,
                version
            } = req.body;

            const herramienta = await Herramienta.obtenerPorId(id);

            if (!herramienta) {
                return res.status(404).json({ error: 'Herramienta no encontrada' });
            }

            // Si hay nuevo archivo, actualizar ruta
            let nombre_archivo = herramienta.nombre_archivo;
            let ruta_archivo = herramienta.ruta_archivo;

            if (req.file) {
                // Eliminar archivo anterior si era físico
                if (herramienta.ruta_archivo && !herramienta.ruta_archivo.startsWith('http') && fs.existsSync(herramienta.ruta_archivo)) {
                    fs.unlinkSync(herramienta.ruta_archivo);
                }

                nombre_archivo = req.file.originalname;
                ruta_archivo = req.file.path;
            } else if (link_publicacion_poe && (!herramienta.ruta_archivo || herramienta.ruta_archivo.startsWith('http'))) {
                // Si solo se actualiza el link y no hay archivo físico
                ruta_archivo = link_publicacion_poe;
                nombre_archivo = 'Documento en línea';
            }

            const resultado = await Herramienta.actualizar(id, {
                tipo_herramienta: tipo_herramienta || herramienta.tipo_herramienta,
                nombre_archivo,
                ruta_archivo,
                fecha_emision: fecha_emision || herramienta.fecha_emision,
                fecha_publicacion_poe: fecha_publicacion_poe !== undefined ? fecha_publicacion_poe : (fecha_emision || herramienta.fecha_publicacion_poe),
                link_publicacion_poe: link_publicacion_poe !== undefined ? link_publicacion_poe : herramienta.link_publicacion_poe,
                estatus_poe: req.body.estatus_poe !== undefined ? req.body.estatus_poe : herramienta.estatus_poe,
                comentarios: req.body.comentarios !== undefined ? req.body.comentarios : herramienta.comentarios,
                version: version || herramienta.version
            });

            // Registrar en historial
            await Historial.registrar({
                herramienta_id: id,
                usuario_id: req.usuario.id,
                accion: 'ACTUALIZACION',
                descripcion: `Actualización de ${herramienta.tipo_herramienta}`
            });

            // Actualizar caché de semáforo
            await SemaforoService.actualizarCacheSemaforo(herramienta.organizacion_id);

            res.json({
                mensaje: 'Herramienta actualizada exitosamente',
                cambios: resultado.changes
            });

        } catch (error) {
            console.error('Error al actualizar herramienta:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Eliminar herramienta (soft delete)
     */
    static async eliminar(req, res) {
        try {
            const { id } = req.params;

            const herramienta = await Herramienta.obtenerPorId(id);

            if (!herramienta) {
                return res.status(404).json({ error: 'Herramienta no encontrada' });
            }

            await Herramienta.eliminar(id);

            // Registrar en historial
            await Historial.registrar({
                herramienta_id: id,
                usuario_id: req.usuario.id,
                accion: 'ELIMINACION',
                descripcion: `Eliminación de ${herramienta.tipo_herramienta} - ${herramienta.nombre_archivo}`
            });

            // Actualizar caché de semáforo
            await SemaforoService.actualizarCacheSemaforo(herramienta.organizacion_id);

            res.json({ mensaje: 'Herramienta eliminada exitosamente' });

        } catch (error) {
            console.error('Error al eliminar herramienta:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Descargar archivo de herramienta
     */
    static async descargar(req, res) {
        try {
            const { id } = req.params;

            const herramienta = await Herramienta.obtenerPorId(id);

            if (!herramienta) {
                return res.status(404).json({ error: 'Herramienta no encontrada' });
            }

            // Si es un link externo (comienza con http), redireccionar
            if (herramienta.ruta_archivo && (herramienta.ruta_archivo.startsWith('http://') || herramienta.ruta_archivo.startsWith('https://'))) {
                return res.redirect(herramienta.ruta_archivo);
            }

            if (!fs.existsSync(herramienta.ruta_archivo)) {
                return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
            }

            res.download(herramienta.ruta_archivo, herramienta.nombre_archivo);

        } catch (error) {
            console.error('Error al descargar archivo:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Obtener herramientas próximas a vencer
     */
    static async proximasAVencer(req, res) {
        try {
            const { meses } = req.query;
            const mesesVencimiento = meses ? parseInt(meses) : 12;

            const herramientas = await Herramienta.obtenerProximasAVencer(mesesVencimiento);

            res.json({
                herramientas,
                criterio: `Herramientas con más de ${mesesVencimiento} meses sin actualizar`
            });

        } catch (error) {
            console.error('Error al obtener herramientas próximas a vencer:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }
}

module.exports = HerramientasController;

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

            if (isNaN(parseInt(id))) {
                return res.status(400).json({ error: 'ID de herramienta no válido' });
            }

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
                version,
                estatus_poe,
                comentarios
            } = req.body;

            // Validaciones
            if (!organizacion_id || !tipo_herramienta || !fecha_emision) {
                return res.status(400).json({
                    error: 'organizacion_id, tipo_herramienta y fecha_emision son requeridos'
                });
            }

            // Validación específica: Si no es Manual de Servicios (o si lo es pero se quiere subir), validar archivo/link
            // Si es Manual de Servicios y no trae archivo/link, asumimos que es un registro "Sin requerimiento" o "No aplica"
            // Pero como la BD exige NOT NULL, usaremos valores dummy si es el caso.

            let finalNombreArchivo = (req.file ? req.file.originalname : null);
            let finalRutaArchivo = (req.file ? req.file.path : null);
            let finalLink = link_publicacion_poe;

            if (tipo_herramienta === 'MANUAL_SERVICIOS' && !req.file && !link_publicacion_poe) {
                finalNombreArchivo = 'NO_APLICA';
                finalRutaArchivo = 'NO_APLICA';
                finalLink = 'NO_APLICA';
            } else {
                if (!req.file && !link_publicacion_poe) {
                    return res.status(400).json({
                        error: 'Debe subir un archivo o proporcionar un link de consulta'
                    });
                }
            }

            const tiposValidos = [
                'ORGANIGRAMA',
                'REGLAMENTO_ESTATUTO',
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
                nombre_archivo: finalNombreArchivo || 'Documento en línea',
                ruta_archivo: finalRutaArchivo || finalLink,
                fecha_emision,
                fecha_publicacion_poe: fecha_publicacion_poe || fecha_emision, // Sincronizar fechas por defecto
                link_publicacion_poe: finalLink !== 'NO_APLICA' ? finalLink : null,
                estatus_poe: estatus_poe || null,
                comentarios: comentarios || null,
                version: version || '1.0',
                usuario_registro_id: req.usuario.id
            });

            // Registrar en historial
            await Historial.registrar({
                herramienta_id: nuevaHerramienta.id,
                usuario_id: req.usuario.id,
                accion: 'CREACION',
                descripcion: `Creación de ${tipo_herramienta} - ${nuevaHerramienta.nombre_archivo}`
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

            // Validar que el ID sea numérico
            if (isNaN(parseInt(id))) {
                return res.status(400).json({ error: 'ID de herramienta no válido' });
            }

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
            } else if (link_publicacion_poe && link_publicacion_poe !== herramienta.link_publicacion_poe) {
                // Si el link cambió y no hay archivo físico nuevo
                ruta_archivo = link_publicacion_poe;
                // Solo cambiar el nombre si antes no era un documento en línea o si queremos resetearlo
                if (!herramienta.ruta_archivo || herramienta.ruta_archivo.startsWith('http')) {
                    nombre_archivo = 'Documento en línea';
                }
            }

            // Función auxiliar para elegir valor (no sobreescribir con vacíos si hay anterior)
            const pick = (nuevo, viejo) => (nuevo !== undefined && nuevo !== '') ? nuevo : viejo;

            const resultado = await Herramienta.actualizar(id, {
                tipo_herramienta: pick(tipo_herramienta, herramienta.tipo_herramienta),
                nombre_archivo,
                ruta_archivo,
                fecha_emision: pick(fecha_emision, herramienta.fecha_emision),
                fecha_publicacion_poe: pick(fecha_publicacion_poe, (fecha_emision || herramienta.fecha_publicacion_poe)),
                link_publicacion_poe: pick(link_publicacion_poe, herramienta.link_publicacion_poe),
                estatus_poe: pick(req.body.estatus_poe, herramienta.estatus_poe),
                comentarios: pick(req.body.comentarios, herramienta.comentarios),
                version: pick(version, herramienta.version)
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

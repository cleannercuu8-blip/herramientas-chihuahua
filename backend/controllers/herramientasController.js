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
            console.log('--- REQ BODY (crear herramienta) ---', req.body);
            console.log('--- REQ FILE ---', req.file ? req.file.originalname : 'No file');

            const {
                organizacion_id,
                tipo_herramienta,
                fecha_emision,
                fecha_publicacion_poe,
                link_publicacion_poe,
                version,
                estatus_poe,
                comentarios,
                nombre_personalizado
            } = req.body;

            // Validaciones
            if (!organizacion_id || !tipo_herramienta || !fecha_emision) {
                console.log('DEBUG: ERROR - Faltan campos requeridos');
                return res.status(400).json({
                    error: 'organizacion_id, tipo_herramienta y fecha_emision son requeridos'
                });
            }

            // Lógica específica para Manual de Servicios (opcionalidad de archivos)
            let finalNombreArchivo = (req.file ? req.file.originalname : null);
            let finalRutaArchivo = (req.file ? req.file.path : null);
            let finalLink = link_publicacion_poe;

            if (tipo_herramienta === 'MANUAL_SERVICIOS' && !req.file && !link_publicacion_poe) {
                console.log('DEBUG: Manual de Servicios sin archivo/link - OK (No aplica)');
                finalNombreArchivo = 'NO_APLICA';
                finalRutaArchivo = 'NO_APLICA';
                finalLink = 'NO_APLICA';
            } else {
                if (!req.file && !link_publicacion_poe) {
                    console.log('DEBUG: ERROR - Ni archivo ni link');
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
                console.log('DEBUG: ERROR - Tipo inválido');
                return res.status(400).json({
                    error: 'Tipo de herramienta inválido',
                    tiposValidos
                });
            }

            // Singleton Rule: For Organigram and Regulation, only ONE active record should exist.
            const singletonTypes = ['ORGANIGRAMA', 'REGLAMENTO_ESTATUTO'];
            if (singletonTypes.includes(tipo_herramienta)) {
                console.log(`DEBUG: Singleton detected (${tipo_herramienta}). Checking for existing record...`);
                const existentes = await Herramienta.obtenerPorOrganizacion(organizacion_id);
                const actual = existentes.find(h => h.tipo_herramienta === tipo_herramienta && h.vigente === 1);

                if (actual) {
                    console.log(`DEBUG: Existing singleton found (ID: ${actual.id}). Soft-deleting...`);
                    await Herramienta.eliminar(actual.id);
                    await Historial.registrar({
                        herramienta_id: actual.id,
                        usuario_id: req.usuario.id,
                        accion: 'ACTUALIZACION',
                        descripcion: `Sustitución automática por nueva versión de ${tipo_herramienta}`
                    });
                }
            }

            // Crear herramienta
            console.log('DEBUG: Persistiendo en DB...');
            const nuevaHerramienta = await Herramienta.crear({
                organizacion_id,
                tipo_herramienta,
                nombre_archivo: finalNombreArchivo || 'Documento en línea',
                ruta_archivo: finalRutaArchivo || finalLink,
                fecha_emision,
                fecha_publicacion_poe: fecha_publicacion_poe || fecha_emision,
                link_publicacion_poe: finalLink !== 'NO_APLICA' ? finalLink : null,
                estatus_poe: estatus_poe || 'VIGENTE',
                comentarios: comentarios || null,
                nombre_personalizado: nombre_personalizado || null,
                version: version || '1.0',
                usuario_registro_id: req.usuario.id
            });
            console.log('DEBUG: ÉXITO - Herramienta ID:', nuevaHerramienta.id);

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
            res.status(500).json({ error: 'Error en el servidor: ' + error.message });
        }
    }

    /**
     * Actualizar herramienta
     */
    static async actualizar(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(parseInt(id))) {
                return res.status(400).json({ error: 'ID de herramienta no válido' });
            }

            const {
                tipo_herramienta,
                fecha_emision,
                fecha_publicacion_poe,
                link_publicacion_poe,
                version,
                estatus_poe,
                comentarios,
                nombre_personalizado
            } = req.body;

            const herramienta = await Herramienta.obtenerPorId(id);

            if (!herramienta) {
                return res.status(404).json({ error: 'Herramienta no encontrada' });
            }

            let nombre_archivo = herramienta.nombre_archivo;
            let ruta_archivo = herramienta.ruta_archivo;

            if (req.file) {
                if (herramienta.ruta_archivo && !herramienta.ruta_archivo.startsWith('http') && fs.existsSync(herramienta.ruta_archivo)) {
                    fs.unlinkSync(herramienta.ruta_archivo);
                }
                nombre_archivo = req.file.originalname;
                ruta_archivo = req.file.path;
            } else if (link_publicacion_poe && link_publicacion_poe !== herramienta.link_publicacion_poe) {
                ruta_archivo = link_publicacion_poe;
                if (!herramienta.ruta_archivo || herramienta.ruta_archivo.startsWith('http')) {
                    nombre_archivo = 'Documento en línea';
                }
            }

            const pick = (nuevo, viejo) => (nuevo !== undefined && nuevo !== '') ? nuevo : viejo;

            const resultado = await Herramienta.actualizar(id, {
                tipo_herramienta: pick(tipo_herramienta, herramienta.tipo_herramienta),
                nombre_archivo,
                ruta_archivo,
                fecha_emision: pick(fecha_emision, herramienta.fecha_emision),
                fecha_publicacion_poe: pick(fecha_publicacion_poe, (fecha_emision || herramienta.fecha_publicacion_poe)),
                link_publicacion_poe: pick(link_publicacion_poe, herramienta.link_publicacion_poe),
                estatus_poe: pick(estatus_poe, herramienta.estatus_poe),
                comentarios: pick(comentarios, herramienta.comentarios),
                nombre_personalizado: pick(nombre_personalizado, herramienta.nombre_personalizado),
                version: pick(version, herramienta.version)
            });

            await Historial.registrar({
                herramienta_id: id,
                usuario_id: req.usuario.id,
                accion: 'ACTUALIZACION',
                descripcion: `Actualización de ${herramienta.tipo_herramienta}`
            });

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

            await Historial.registrar({
                herramienta_id: id,
                usuario_id: req.usuario.id,
                accion: 'ELIMINACION',
                descripcion: `Eliminación de ${herramienta.tipo_herramienta} - ${herramienta.nombre_archivo}`
            });

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

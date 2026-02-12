const Expediente = require('../models/Expediente');
const EtapaExpediente = require('../models/EtapaExpediente');

class ExpedientesController {
    static async obtenerTodos(req, res) {
        try {
            const expedientes = await Expediente.obtenerTodos(req.query);
            res.json({ expedientes });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener expedientes' });
        }
    }

    static async obtenerPorId(req, res) {
        try {
            const { id } = req.params;
            const expediente = await Expediente.obtenerPorId(id);
            if (!expediente) return res.status(404).json({ error: 'No encontrado' });

            const EtapaExpediente = require('../models/EtapaExpediente');
            const ExpedienteAvance = require('../models/ExpedienteAvance');

            const etapas = await EtapaExpediente.obtenerPorExpediente(id);
            const avances = await ExpedienteAvance.obtenerPorExpediente(id);

            res.json({ expediente, etapas, avances });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener detalle' });
        }
    }

    static async crear(req, res) {
        try {
            const data = { ...req.body, capturista_id: req.usuario.id };
            const nuevo = await Expediente.crear(data);
            res.status(201).json(nuevo);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al crear expediente' });
        }
    }

    static async actualizar(req, res) {
        try {
            const { id } = req.params;
            await Expediente.actualizar(id, req.body);
            res.json({ mensaje: 'Actualizado' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al actualizar' });
        }
    }

    static async agregarEtapa(req, res) {
        try {
            const { id } = req.params;
            const etapa = await EtapaExpediente.agregar({ ...req.body, expediente_id: id });
            res.json(etapa);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al agregar etapa' });
        }
    }

    static async agregarAvance(req, res) {
        const ExpedienteAvance = require('../models/ExpedienteAvance');
        try {
            const { id } = req.params;
            const { titulo, descripcion, tipo, fecha } = req.body;

            const avance = await ExpedienteAvance.crear({
                expediente_id: id,
                usuario_id: req.usuario.id,
                titulo,
                descripcion,
                tipo,
                fecha: fecha || null
            });

            // Actualizar fecha de última actualización del expediente
            await Expediente.actualizar(id, {
                ultima_actualizacion: new Date()
            });

            res.status(201).json({
                mensaje: 'Avance registrado exitosamente',
                avance
            });

        } catch (error) {
            console.error('Error al agregar avance:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }
}

module.exports = ExpedientesController;

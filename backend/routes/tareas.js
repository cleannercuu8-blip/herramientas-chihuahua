const express = require('express');
const router = express.Router();
const Tarea = require('../models/Tarea');
const { verificarToken, verificarRol } = require('../middleware/auth');

// Todas las rutas requieren token
router.use(verificarToken);

// Obtener tareas asignadas al usuario actual
router.get('/mis-tareas', async (req, res) => {
    try {
        const tareas = await Tarea.obtenerPorAsignado(req.usuario.id);
        res.json({ success: true, tareas });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener todas las tareas (Solo ADMIN para supervisión)
router.get('/todas', verificarRol('ADMINISTRADOR'), async (req, res) => {
    try {
        const tareas = await Tarea.obtenerTodas();
        res.json({ success: true, tareas });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear nueva tarea (Solo ADMIN)
router.post('/', verificarRol('ADMINISTRADOR'), async (req, res) => {
    try {
        const nuevaTarea = await Tarea.crear({
            ...req.body,
            creado_por_id: req.usuario.id
        });
        res.status(201).json({ success: true, tarea: nuevaTarea });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Actualizar estatus (Asignado o Admin)
router.patch('/:id/estatus', async (req, res) => {
    try {
        const { estatus } = req.body;
        const tareaActualizada = await Tarea.actualizarEstatus(req.params.id, estatus);
        res.json({ success: true, tarea: tareaActualizada });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Eliminar tarea (Solo ADMIN)
router.delete('/:id', verificarRol('ADMINISTRADOR'), async (req, res) => {
    try {
        await Tarea.eliminar(req.params.id);
        res.json({ success: true, mensaje: 'Tarea eliminada' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

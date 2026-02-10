const express = require('express');
const router = express.Router();
const OrganizacionesController = require('../controllers/organizacionesController');
const { verificarToken, verificarRol } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Obtener todas las organizaciones (todos los roles)
router.get('/', OrganizacionesController.obtenerTodas);

// Obtener estadísticas de semáforo (todos los roles)
router.get('/estadisticas', OrganizacionesController.obtenerEstadisticas);

// Obtener una organización por ID (todos los roles)
router.get('/:id', OrganizacionesController.obtenerPorId);

// Crear organización (solo ADMINISTRADOR y CAPTURISTA)
router.post('/', verificarRol('ADMINISTRADOR', 'CAPTURISTA'), OrganizacionesController.crear);

// Actualizar organización (solo ADMINISTRADOR y CAPTURISTA)
router.put('/:id', verificarRol('ADMINISTRADOR', 'CAPTURISTA'), OrganizacionesController.actualizar);

// Eliminar organización (solo ADMINISTRADOR)
router.delete('/:id', verificarRol('ADMINISTRADOR'), OrganizacionesController.eliminar);

module.exports = router;

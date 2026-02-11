const express = require('express');
const router = express.Router();
const ExpedientesController = require('../controllers/expedientesController');
const AuthModule = require('../middleware/auth'); // assuming middleware is here or I check where AuthModule comes from

const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', ExpedientesController.obtenerTodos);
router.get('/:id', ExpedientesController.obtenerPorId);
router.post('/', verificarRol('ADMINISTRADOR', 'CAPTURISTA'), ExpedientesController.crear);
router.put('/:id', verificarRol('ADMINISTRADOR', 'CAPTURISTA'), ExpedientesController.actualizar);
router.post('/:id/etapas', verificarRol('ADMINISTRADOR', 'CAPTURISTA'), ExpedientesController.agregarEtapa);
router.post('/:id/avances', verificarRol('ADMINISTRADOR', 'CAPTURISTA'), ExpedientesController.agregarAvance);

module.exports = router;

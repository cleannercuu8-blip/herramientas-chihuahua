const express = require('express');
const router = express.Router();
const HerramientasController = require('../controllers/herramientasController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Obtener todas las herramientas (todos los roles)
router.get('/', HerramientasController.obtenerTodas);

// Obtener herramientas próximas a vencer (todos los roles)
router.get('/proximas-vencer', HerramientasController.proximasAVencer);

// Obtener una herramienta por ID (todos los roles)
router.get('/:id', HerramientasController.obtenerPorId);

// Descargar archivo de herramienta (todos los roles)
router.get('/:id/descargar', HerramientasController.descargar);

// Crear herramienta con archivo (solo ADMINISTRADOR y CAPTURISTA)
router.post(
    '/',
    verificarRol('ADMINISTRADOR', 'CAPTURISTA'),
    upload.single('archivo'),
    HerramientasController.crear
);

// Actualizar herramienta (solo ADMINISTRADOR y CAPTURISTA)
router.put(
    '/:id',
    verificarRol('ADMINISTRADOR', 'CAPTURISTA'),
    upload.single('archivo'),
    HerramientasController.actualizar
);

// Eliminar herramienta (solo ADMINISTRADOR)
router.delete('/:id', verificarRol('ADMINISTRADOR'), HerramientasController.eliminar);

module.exports = router;

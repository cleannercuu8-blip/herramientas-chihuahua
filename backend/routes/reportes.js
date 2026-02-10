const express = require('express');
const router = express.Router();
const ReportesController = require('../controllers/reportesController');
const { verificarToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Exportar inventario completo a Excel
router.get('/exportar/inventario', ReportesController.exportarInventarioExcel);

// Exportar reporte de semáforo a Excel
router.get('/exportar/semaforo', ReportesController.exportarSemaforoExcel);

// Exportar herramientas próximas a vencer a Excel
router.get('/exportar/proximas-vencer', ReportesController.exportarProximasVencerExcel);

// Obtener historial de cambios
router.get('/historial', ReportesController.obtenerHistorial);

module.exports = router;

const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/searchController');

const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);

router.get('/smart', SearchController.smartSearch);
router.get('/cargas-trabajo', verificarRol('ADMINISTRADOR'), SearchController.obtenerCargasTrabajo);

module.exports = router;

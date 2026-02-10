const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');

// Rutas públicas
router.post('/login', AuthController.login);

// Rutas protegidas
router.get('/perfil', verificarToken, AuthController.obtenerPerfil);
router.post('/registrar', verificarToken, AuthController.registrar);

module.exports = router;

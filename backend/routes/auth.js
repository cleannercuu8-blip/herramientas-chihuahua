const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');

// Rutas públicas
router.post('/login', AuthController.login);
router.post('/solicitar-recuperacion', AuthController.solicitarRecuperacion);
router.post('/restablecer-password', AuthController.restablecerPassword);

// Rutas protegidas
router.get('/perfil', verificarToken, AuthController.obtenerPerfil);
router.put('/cambiar-password', verificarToken, AuthController.cambiarPassword);
router.post('/registrar', verificarToken, AuthController.registrar);

// Rutas de administración de usuarios (Solo Admin)
const { verificarRol } = require('../middleware/auth');
router.get('/usuarios', verificarToken, verificarRol('ADMINISTRADOR'), AuthController.listarUsuarios);
router.put('/usuarios/:id', verificarToken, verificarRol('ADMINISTRADOR'), AuthController.actualizarUsuarioAdmin);
router.delete('/usuarios/:id', verificarToken, verificarRol('ADMINISTRADOR'), AuthController.eliminarUsuarioAdmin);

module.exports = router;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * Controlador de autenticación
 */
class AuthController {

    /**
     * Login de usuario
     */
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    error: 'Email y contraseña son requeridos'
                });
            }

            // Buscar usuario
            const usuario = await Usuario.buscarPorEmail(email);

            if (!usuario) {
                return res.status(401).json({
                    error: 'Credenciales inválidas'
                });
            }

            if (!usuario.activo) {
                return res.status(401).json({
                    error: 'Usuario inactivo. Contacte al administrador.'
                });
            }

            // Verificar contraseña
            const passwordValido = await bcrypt.compare(password, usuario.password_hash);

            if (!passwordValido) {
                return res.status(401).json({
                    error: 'Credenciales inválidas'
                });
            }

            // Generar token JWT
            const token = jwt.sign(
                {
                    id: usuario.id,
                    email: usuario.email,
                    rol: usuario.rol
                },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.json({
                mensaje: 'Login exitoso',
                token,
                usuario: {
                    id: usuario.id,
                    nombre_completo: usuario.nombre_completo,
                    email: usuario.email,
                    rol: usuario.rol
                }
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Registro de nuevo usuario (solo ADMINISTRADOR)
     */
    static async registrar(req, res) {
        try {
            const { nombre_completo, email, password, rol } = req.body;

            // Validaciones
            if (!nombre_completo || !email || !password || !rol) {
                return res.status(400).json({
                    error: 'Todos los campos son requeridos'
                });
            }

            const rolesValidos = ['ADMINISTRADOR', 'CAPTURISTA', 'CONSULTOR'];
            if (!rolesValidos.includes(rol)) {
                return res.status(400).json({
                    error: 'Rol inválido',
                    rolesValidos
                });
            }

            // Verificar si el email ya existe
            const usuarioExistente = await Usuario.buscarPorEmail(email);
            if (usuarioExistente) {
                return res.status(400).json({
                    error: 'El email ya está registrado'
                });
            }

            // Hash de contraseña
            const password_hash = await bcrypt.hash(password, 10);

            // Crear usuario
            const nuevoUsuario = await Usuario.crear({
                nombre_completo,
                email,
                password_hash,
                rol
            });

            res.status(201).json({
                mensaje: 'Usuario creado exitosamente',
                usuario: {
                    id: nuevoUsuario.id,
                    nombre_completo,
                    email,
                    rol
                }
            });

        } catch (error) {
            console.error('Error al registrar usuario:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Obtener información del usuario actual
     */
    static async obtenerPerfil(req, res) {
        try {
            const usuario = await Usuario.buscarPorId(req.usuario.id);

            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.json({ usuario });

        } catch (error) {
            console.error('Error al obtener perfil:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }
}

module.exports = AuthController;

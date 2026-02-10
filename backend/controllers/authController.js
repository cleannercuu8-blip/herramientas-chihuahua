const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const db = require('../config/database');
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

    /**
     * Listar todos los usuarios (Solo Admin)
     */
    static async listarUsuarios(req, res) {
        try {
            const usuarios = await Usuario.obtenerTodos();
            res.json({ usuarios });
        } catch (error) {
            console.error('Error al listar usuarios:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Actualizar usuario desde administración (Solo Admin)
     */
    static async actualizarUsuarioAdmin(req, res) {
        try {
            const { id } = req.params;
            const { nombre_completo, email, rol, activo, password } = req.body;

            if (!nombre_completo || !email || !rol) {
                return res.status(400).json({ error: 'Campos requeridos faltantes' });
            }

            const datos = { nombre_completo, email, rol, activo: parseInt(activo) };

            // Si viene una nueva contraseña, hacerle hash
            if (password && password.trim() !== '') {
                datos.password_hash = await bcrypt.hash(password, 10);
                await db.query(
                    'UPDATE usuarios SET nombre_completo=$1, email=$2, rol=$3, activo=$4, password_hash=$5 WHERE id=$6',
                    [datos.nombre_completo, datos.email, datos.rol, datos.activo, datos.password_hash, id]
                );
            } else {
                await Usuario.actualizar(id, datos);
            }

            res.json({ mensaje: 'Usuario actualizado correctamente' });
        } catch (error) {
            console.error('Error al actualizar usuario admin:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Eliminar usuario (Solo Admin)
     */
    static async eliminarUsuarioAdmin(req, res) {
        try {
            const { id } = req.params;

            // Evitar que el admin se elimine a sí mismo
            if (parseInt(id) === req.usuario.id) {
                return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de administrador' });
            }

            await Usuario.eliminar(id);
            res.json({ mensaje: 'Usuario eliminado correctamente' });
        } catch (error) {
            console.error('Error al eliminar usuario admin:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }

    /**
     * Cambiar contraseña del usuario actual
     */
    static async cambiarPassword(req, res) {
        try {
            const { passwordActual, nuevoPassword } = req.body;
            const usuarioId = req.usuario.id;

            if (!passwordActual || !nuevoPassword) {
                return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
            }

            // Buscar usuario con password_hash
            const usuario = await Usuario.buscarPorEmail(req.usuario.email);

            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // Verificar contraseña actual
            const passwordValido = await bcrypt.compare(passwordActual, usuario.password_hash);

            if (!passwordValido) {
                return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
            }

            // Hash de la nueva contraseña
            const nuevoPasswordHash = await bcrypt.hash(nuevoPassword, 10);

            // Actualizar en la base de datos
            await db.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [nuevoPasswordHash, usuarioId]);

            res.json({ mensaje: 'Contraseña actualizada exitosamente' });

        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }
}

module.exports = AuthController;

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'chihuahua-herramientas-secret-2024';

/**
 * Middleware de autenticación
 * Verifica que el token JWT sea válido
 */
const verificarToken = (req, res, next) => {
    let token = req.headers['authorization']?.split(' ')[1];

    // También permitir pasar el token como parámetro de consulta para descargas
    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            error: 'Acceso denegado. No se proporcionó token de autenticación.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Token inválido o expirado.'
        });
    }
};

/**
 * Middleware de autorización por rol
 * Verifica que el usuario tenga uno de los roles permitidos
 */
const verificarRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({
                error: 'Usuario no autenticado.'
            });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                error: 'No tienes permisos para realizar esta acción.',
                rolRequerido: rolesPermitidos,
                tuRol: req.usuario.rol
            });
        }

        next();
    };
};

/**
 * Middleware para permitir solo lectura a consultores
 */
const soloLectura = (req, res, next) => {
    if (req.usuario.rol === 'CONSULTOR' && req.method !== 'GET') {
        return res.status(403).json({
            error: 'Los consultores solo tienen permisos de lectura.'
        });
    }
    next();
};

module.exports = {
    verificarToken,
    verificarRol,
    soloLectura,
    JWT_SECRET
};

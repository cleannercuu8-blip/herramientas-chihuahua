const db = require('../config/database');

class Usuario {
    static async crearTabla() {
        const sql = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre_completo TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        rol TEXT CHECK(rol IN ('ADMINISTRADOR', 'CAPTURISTA', 'CONSULTOR')) NOT NULL,
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
        return db.query(sql);
    }

    static async crear(usuario) {
        const sql = `
      INSERT INTO usuarios (nombre_completo, email, password_hash, rol)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nombre_completo, email, rol, activo, fecha_creacion
    `;
        const values = [usuario.nombre_completo, usuario.email, usuario.password_hash, usuario.rol];
        const { rows } = await db.query(sql, values);
        return rows[0];
    }

    static async buscarPorEmail(email) {
        const sql = 'SELECT * FROM usuarios WHERE email = $1';
        const { rows } = await db.query(sql, [email]);
        return rows[0];
    }

    static async buscarPorId(id) {
        const sql = 'SELECT id, nombre_completo, email, rol, activo, fecha_creacion FROM usuarios WHERE id = $1';
        const { rows } = await db.query(sql, [id]);
        return rows[0];
    }

    static async obtenerTodos() {
        const sql = 'SELECT id, nombre_completo, email, rol, activo, fecha_creacion FROM usuarios ORDER BY nombre_completo';
        const { rows } = await db.query(sql);
        return rows;
    }

    static async actualizar(id, datos) {
        const sql = `
      UPDATE usuarios 
      SET nombre_completo = $1, email = $2, rol = $3, activo = $4
      WHERE id = $5
    `;
        const result = await db.query(sql, [datos.nombre_completo, datos.email, datos.rol, datos.activo, id]);
        return { changes: result.rowCount };
    }

    static async eliminar(id) {
        const sql = 'DELETE FROM usuarios WHERE id = $1';
        const result = await db.query(sql, [id]);
        return { changes: result.rowCount };
    }
}

module.exports = Usuario;

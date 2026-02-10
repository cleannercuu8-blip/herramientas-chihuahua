const db = require('../config/database');

class Organizacion {
    static async crearTabla() {
        const sql = `
      CREATE TABLE IF NOT EXISTS organizaciones (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        tipo TEXT CHECK(tipo IN ('DEPENDENCIA', 'ENTIDAD_PARAESTATAL')) NOT NULL,
        siglas TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo INTEGER DEFAULT 1
      )
    `;
        return db.query(sql);
    }

    static async crear(organizacion) {
        const sql = `
      INSERT INTO organizaciones (nombre, tipo, siglas)
      VALUES ($1, $2, $3)
      RETURNING id, nombre, tipo, siglas, fecha_creacion, activo
    `;
        const { rows } = await db.query(sql, [organizacion.nombre, organizacion.tipo, organizacion.siglas]);
        return rows[0];
    }

    static async obtenerTodas() {
        const sql = 'SELECT * FROM organizaciones WHERE activo = 1 ORDER BY nombre';
        const { rows } = await db.query(sql);
        return rows;
    }

    static async obtenerPorId(id) {
        const sql = 'SELECT * FROM organizaciones WHERE id = $1';
        const { rows } = await db.query(sql, [id]);
        return rows[0];
    }

    static async obtenerPorTipo(tipo) {
        const sql = 'SELECT * FROM organizaciones WHERE tipo = $1 AND activo = 1 ORDER BY nombre';
        const { rows } = await db.query(sql, [tipo]);
        return rows;
    }

    static async actualizar(id, datos) {
        const sql = `
      UPDATE organizaciones 
      SET nombre = $1, tipo = $2, siglas = $3, activo = $4
      WHERE id = $5
    `;
        const result = await db.query(sql, [datos.nombre, datos.tipo, datos.siglas, datos.activo, id]);
        return { changes: result.rowCount };
    }

    static async eliminar(id) {
        const sql = 'UPDATE organizaciones SET activo = 0 WHERE id = $1';
        const result = await db.query(sql, [id]);
        return { changes: result.rowCount };
    }
}

module.exports = Organizacion;

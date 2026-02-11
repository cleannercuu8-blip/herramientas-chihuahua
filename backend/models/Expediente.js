const db = require('../config/database');

class Expediente {
    static async crearTabla() {
        const sql = `
      CREATE TABLE IF NOT EXISTS expedientes (
        id SERIAL PRIMARY KEY,
        organizacion_id INTEGER NOT NULL,
        numero_expediente TEXT NOT NULL,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        estatus TEXT CHECK(estatus IN ('ABIERTO', 'EN_PROCESO', 'CERRADO', 'SUSPENDIDO')) DEFAULT 'ABIERTO',
        prioridad TEXT CHECK(prioridad IN ('BAJA', 'MEDIA', 'ALTA')) DEFAULT 'MEDIA',
        porcentaje_progreso INTEGER DEFAULT 0,
        fecha_inicio DATE DEFAULT CURRENT_DATE,
        ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        capturista_id INTEGER NOT NULL,
        FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id),
        FOREIGN KEY (capturista_id) REFERENCES usuarios(id)
      )
    `;
        return db.query(sql);
    }

    static async crear(datos) {
        const sql = `
      INSERT INTO expedientes (
        organizacion_id, numero_expediente, titulo, descripcion,
        estatus, prioridad, capturista_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [
            datos.organizacion_id, datos.numero_expediente, datos.titulo,
            datos.descripcion, datos.estatus || 'ABIERTO',
            datos.prioridad || 'MEDIA', datos.capturista_id
        ];
        const { rows } = await db.query(sql, values);
        return rows[0];
    }

    static async obtenerTodos(filtros = {}) {
        let sql = `
      SELECT e.*, o.nombre as organizacion_nombre, u.nombre_completo as capturista_nombre
      FROM expedientes e
      LEFT JOIN organizaciones o ON e.organizacion_id = o.id
      LEFT JOIN usuarios u ON e.capturista_id = u.id
      WHERE 1=1
    `;
        const values = [];

        if (filtros.organizacion_id) {
            values.push(filtros.organizacion_id);
            sql += ` AND e.organizacion_id = $${values.length}`;
        }
        if (filtros.estatus) {
            values.push(filtros.estatus);
            sql += ` AND e.estatus = $${values.length}`;
        }

        sql += ' ORDER BY e.ultima_actualizacion DESC';
        const { rows } = await db.query(sql, values);
        return rows;
    }

    static async obtenerPorId(id) {
        const sql = `
      SELECT e.*, o.nombre as organizacion_nombre, u.nombre_completo as capturista_nombre
      FROM expedientes e
      LEFT JOIN organizaciones o ON e.organizacion_id = o.id
      LEFT JOIN usuarios u ON e.capturista_id = u.id
      WHERE e.id = $1
    `;
        const { rows } = await db.query(sql, [id]);
        return rows[0];
    }

    static async actualizar(id, datos) {
        const sql = `
      UPDATE expedientes 
      SET titulo = $1, descripcion = $2, estatus = $3, 
          prioridad = $4, porcentaje_progreso = $5, 
          ultima_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $6
    `;
        const values = [
            datos.titulo, datos.descripcion, datos.estatus,
            datos.prioridad, datos.porcentaje_progreso, id
        ];
        return db.query(sql, values);
    }
}

module.exports = Expediente;

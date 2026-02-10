const db = require('../config/database');

class Historial {
    static async crearTabla() {
        const sql = `
      CREATE TABLE IF NOT EXISTS historial (
        id SERIAL PRIMARY KEY,
        herramienta_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        accion TEXT CHECK(accion IN ('CREACION', 'ACTUALIZACION', 'ELIMINACION')) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        descripcion TEXT,
        FOREIGN KEY (herramienta_id) REFERENCES herramientas(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `;
        return db.query(sql);
    }

    static async registrar(registro) {
        const sql = `
      INSERT INTO historial (herramienta_id, usuario_id, accion, descripcion)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
        const values = [
            registro.herramienta_id,
            registro.usuario_id,
            registro.accion,
            registro.descripcion
        ];
        const { rows } = await db.query(sql, values);
        return rows[0];
    }

    static async obtenerPorHerramienta(herramientaId) {
        const sql = `
      SELECT h.*, u.nombre_completo as usuario_nombre
      FROM historial h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE h.herramienta_id = $1
      ORDER BY h.fecha DESC
    `;
        const { rows } = await db.query(sql, [herramientaId]);
        return rows;
    }

    static async obtenerTodos(limite = 100) {
        const sql = `
      SELECT h.*, u.nombre_completo as usuario_nombre,
             her.nombre_archivo as herramienta_nombre,
             o.nombre as organizacion_nombre
      FROM historial h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      LEFT JOIN herramientas her ON h.herramienta_id = her.id
      LEFT JOIN organizaciones o ON her.organizacion_id = o.id
      ORDER BY h.fecha DESC
      LIMIT $1
    `;
        const { rows } = await db.query(sql, [limite]);
        return rows;
    }
}

module.exports = Historial;

const db = require('../config/database');

class EtapaExpediente {
    static async crearTabla() {
        const sql = `
      CREATE TABLE IF NOT EXISTS expediente_etapas (
        id SERIAL PRIMARY KEY,
        expediente_id INTEGER NOT NULL,
        orden INTEGER NOT NULL,
        nombre_etapa TEXT NOT NULL,
        descripcion TEXT,
        completada BOOLEAN DEFAULT FALSE,
        fecha_cumplimiento TIMESTAMP,
        FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE
      )
    `;
        return db.query(sql);
    }

    static async agregar(datos) {
        const sql = `
      INSERT INTO expediente_etapas (expediente_id, orden, nombre_etapa, descripcion)
      VALUES ($1, $2, $3, $4) RETURNING *
    `;
        const values = [datos.expediente_id, datos.orden, datos.nombre_etapa, datos.descripcion];
        const { rows } = await db.query(sql, values);
        return rows[0];
    }

    static async obtenerPorExpediente(expedienteId) {
        const sql = 'SELECT * FROM expediente_etapas WHERE expediente_id = $1 ORDER BY orden ASC';
        const { rows } = await db.query(sql, [expedienteId]);
        return rows;
    }

    static async actualizarStatus(id, completada) {
        const sql = `
      UPDATE expediente_etapas 
      SET completada = $1, fecha_cumplimiento = CASE WHEN $1 = TRUE THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = $2
    `;
        return db.query(sql, [completada, id]);
    }
}

module.exports = EtapaExpediente;

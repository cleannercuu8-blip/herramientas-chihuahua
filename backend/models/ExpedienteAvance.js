const db = require('../config/database');

class ExpedienteAvance {
    static async crearTabla() {
        const sql = `
            CREATE TABLE IF NOT EXISTS expediente_avances (
                id SERIAL PRIMARY KEY,
                expediente_id INTEGER NOT NULL,
                usuario_id INTEGER NOT NULL,
                titulo TEXT NOT NULL,
                descripcion TEXT,
                tipo TEXT CHECK(tipo IN ('AVANCE', 'REUNION', 'OFICIO', 'OTRO')) DEFAULT 'AVANCE',
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
        `;
        return db.query(sql);
    }

    static async crear(datos) {
        const sql = `
            INSERT INTO expediente_avances (expediente_id, usuario_id, titulo, descripcion, tipo, fecha)
            VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_TIMESTAMP))
            RETURNING *
        `;
        const values = [
            datos.expediente_id,
            datos.usuario_id,
            datos.titulo,
            datos.descripcion,
            datos.tipo || 'AVANCE',
            datos.fecha
        ];
        const { rows } = await db.query(sql, values);
        return rows[0];
    }

    static async obtenerPorExpediente(expedienteId) {
        const sql = `
            SELECT ea.*, u.nombre_completo as usuario_nombre
            FROM expediente_avances ea
            LEFT JOIN usuarios u ON ea.usuario_id = u.id
            WHERE ea.expediente_id = $1
            ORDER BY ea.fecha DESC
        `;
        const { rows } = await db.query(sql, [expedienteId]);
        return rows;
    }
}

module.exports = ExpedienteAvance;

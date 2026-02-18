const db = require('../config/database');

class Tarea {
    static async crearTabla() {
        const sql = `
            CREATE TABLE IF NOT EXISTS tareas (
                id SERIAL PRIMARY KEY,
                titulo TEXT NOT NULL,
                descripcion TEXT,
                prioridad TEXT DEFAULT 'MEDIA', -- ALTA, MEDIA, BAJA
                estatus TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, EN_PROCESO, FINALIZADA
                creado_por_id INTEGER REFERENCES usuarios(id),
                asignado_a_id INTEGER REFERENCES usuarios(id),
                fecha_limite DATE,
                leida BOOLEAN DEFAULT FALSE,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        return await db.query(sql);
    }

    static async crear(datos) {
        const { titulo, descripcion, prioridad, asignado_a_id, creado_por_id, fecha_limite } = datos;
        const sql = `
            INSERT INTO tareas (titulo, descripcion, prioridad, asignado_a_id, creado_por_id, fecha_limite)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [titulo, descripcion, prioridad, asignado_a_id, creado_por_id, fecha_limite]);
        return rows[0];
    }

    static async obtenerPorAsignado(usuarioId) {
        const sql = `
            SELECT t.*, u.nombre_completo as creado_por_nombre 
            FROM tareas t
            JOIN usuarios u ON t.creado_por_id = u.id
            WHERE t.asignado_a_id = $1
            ORDER BY t.fecha_creacion DESC;
        `;
        const { rows } = await db.query(sql, [usuarioId]);
        return rows;
    }

    static async obtenerTodas() {
        const sql = `
            SELECT t.*, 
                   u1.nombre_completo as asignado_a_nombre,
                   u2.nombre_completo as creado_por_nombre
            FROM tareas t
            JOIN usuarios u1 ON t.asignado_a_id = u1.id
            JOIN usuarios u2 ON t.creado_por_id = u2.id
            ORDER BY t.fecha_creacion DESC;
        `;
        const { rows } = await db.query(sql);
        return rows;
    }

    static async actualizarEstatus(id, estatus) {
        const sql = `
            UPDATE tareas 
            SET estatus = $1, fecha_actualizacion = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [estatus.toUpperCase(), id]);
        return rows[0];
    }

    static async eliminar(id) {
        return await db.query('DELETE FROM tareas WHERE id = $1', [id]);
    }
}

module.exports = Tarea;

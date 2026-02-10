const db = require('../config/database');

class Organizacion {
    static async crearTabla() {
        const sql = `
      CREATE TABLE IF NOT EXISTS organizaciones (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        tipo TEXT CHECK(tipo IN ('DEPENDENCIA', 'ENTIDAD_PARAESTATAL')) NOT NULL,
        siglas TEXT,
        titular TEXT,
        decreto_creacion TEXT,
        semaforo TEXT DEFAULT 'ROJO',
        detalles_semaforo JSONB,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo INTEGER DEFAULT 1
      )
    `;
        return db.query(sql);
    }

    static async crear(organizacion) {
        const sql = `
      INSERT INTO organizaciones (nombre, tipo, siglas, titular, decreto_creacion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nombre, tipo, siglas, titular, decreto_creacion, semaforo, detalles_semaforo, fecha_creacion, activo
    `;
        const { rows } = await db.query(sql, [organizacion.nombre, organizacion.tipo, organizacion.siglas, organizacion.titular, organizacion.decreto_creacion]);
        return rows[0];
    }

    static async obtenerTodas(limite, offset) {
        let sql = 'SELECT * FROM organizaciones WHERE activo = 1 ORDER BY nombre';
        const params = [];

        if (limite) {
            sql += ' LIMIT $' + (params.length + 1);
            params.push(limite);
        }

        if (offset) {
            sql += ' OFFSET $' + (params.length + 1);
            params.push(offset);
        }

        const { rows } = await db.query(sql, params);
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
      SET nombre = $1, tipo = $2, siglas = $3, titular = $4, decreto_creacion = $5, activo = $6
      WHERE id = $7
    `;
        const result = await db.query(sql, [datos.nombre, datos.tipo, datos.siglas, datos.titular, datos.decreto_creacion, datos.activo, id]);
        return { changes: result.rowCount };
    }

    static async actualizarSemaforoCache(id, semaforo, detalles) {
        const sql = `
      UPDATE organizaciones 
      SET semaforo = $1, detalles_semaforo = $2
      WHERE id = $3
    `;
        return db.query(sql, [semaforo, JSON.stringify(detalles), id]);
    }

    static async eliminar(id) {
        const sql = 'UPDATE organizaciones SET activo = 0 WHERE id = $1';
        const result = await db.query(sql, [id]);
        return { changes: result.rowCount };
    }

    static async borrarDefinitivamente(id) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Borrar historial de las herramientas de esta organización
            await client.query(`
                DELETE FROM historial 
                WHERE herramienta_id IN (SELECT id FROM herramientas WHERE organizacion_id = $1)
            `, [id]);

            // 2. Borrar herramientas de esta organización
            await client.query('DELETE FROM herramientas WHERE organizacion_id = $1', [id]);

            // 3. Borrar la organización
            const result = await client.query('DELETE FROM organizaciones WHERE id = $1', [id]);

            await client.query('COMMIT');
            return { changes: result.rowCount };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = Organizacion;

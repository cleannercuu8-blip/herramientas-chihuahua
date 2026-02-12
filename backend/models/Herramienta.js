const db = require('../config/database');

class Herramienta {
  static async crearTabla() {
    const sql = `
      CREATE TABLE IF NOT EXISTS herramientas (
        id SERIAL PRIMARY KEY,
        organizacion_id INTEGER NOT NULL,
        tipo_herramienta TEXT CHECK(tipo_herramienta IN (
          'ORGANIGRAMA',
          'REGLAMENTO_ESTATUTO',
          'MANUAL_ORGANIZACION',
          'MANUAL_PROCEDIMIENTOS',
          'MANUAL_SERVICIOS'
        )) NOT NULL,
        nombre_archivo TEXT NOT NULL,
        ruta_archivo TEXT NOT NULL,
        fecha_emision DATE NOT NULL,
        fecha_publicacion_poe DATE,
        link_publicacion_poe TEXT,
        estatus_poe TEXT,
        comentarios TEXT,
        version TEXT,
        vigente INTEGER DEFAULT 1,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_registro_id INTEGER NOT NULL,
        FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id),
        FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id)
      )
    `;
    return db.query(sql);
  }

  static async crear(herramienta) {
    const sql = `
      INSERT INTO herramientas (
        organizacion_id, tipo_herramienta, nombre_archivo, ruta_archivo,
        fecha_emision, fecha_publicacion_poe, link_publicacion_poe,
        estatus_poe, comentarios, version, usuario_registro_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      herramienta.organizacion_id,
      herramienta.tipo_herramienta,
      herramienta.nombre_archivo,
      herramienta.ruta_archivo,
      herramienta.fecha_emision,
      herramienta.fecha_publicacion_poe,
      herramienta.link_publicacion_poe,
      herramienta.estatus_poe,
      herramienta.comentarios,
      herramienta.version,
      herramienta.usuario_registro_id
    ];
    const { rows } = await db.query(sql, values);
    return rows[0];
  }

  static async obtenerPorOrganizacion(organizacionId) {
    const sql = `
      SELECT h.*, u.nombre_completo as usuario_registro
      FROM herramientas h
      LEFT JOIN usuarios u ON h.usuario_registro_id = u.id
      WHERE h.organizacion_id = $1 AND h.vigente = 1
      ORDER BY h.fecha_actualizacion DESC
    `;
    const { rows } = await db.query(sql, [organizacionId]);
    return rows;
  }

  static async obtenerTodas() {
    const sql = `
      SELECT h.*, o.nombre as organizacion_nombre, o.tipo as organizacion_tipo,
             u.nombre_completo as usuario_registro
      FROM herramientas h
      LEFT JOIN organizaciones o ON h.organizacion_id = o.id
      LEFT JOIN usuarios u ON h.usuario_registro_id = u.id
      WHERE h.vigente = 1
      ORDER BY h.fecha_actualizacion DESC
    `;
    const { rows } = await db.query(sql);
    return rows;
  }

  static async obtenerPorId(id) {
    if (isNaN(parseInt(id))) return null;
    const sql = `
      SELECT h.*, o.nombre as organizacion_nombre, o.tipo as organizacion_tipo,
             u.nombre_completo as usuario_registro
      FROM herramientas h
      LEFT JOIN organizaciones o ON h.organizacion_id = o.id
      LEFT JOIN usuarios u ON h.usuario_registro_id = u.id
      WHERE h.id = $1
    `;
    const { rows } = await db.query(sql, [id]);
    return rows[0];
  }

  static async actualizar(id, datos) {
    const sql = `
      UPDATE herramientas 
      SET tipo_herramienta = $1, nombre_archivo = $2, ruta_archivo = $3,
          fecha_emision = $4, fecha_publicacion_poe = $5, link_publicacion_poe = $6,
          estatus_poe = $7, comentarios = $8, version = $9, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $10
    `;
    const values = [
      datos.tipo_herramienta,
      datos.nombre_archivo,
      datos.ruta_archivo,
      datos.fecha_emision,
      datos.fecha_publicacion_poe,
      datos.link_publicacion_poe,
      datos.estatus_poe,
      datos.comentarios,
      datos.version,
      id
    ];
    const result = await db.query(sql, values);
    return { changes: result.rowCount };
  }

  static async eliminar(id) {
    const sql = 'UPDATE herramientas SET vigente = 0 WHERE id = $1';
    const result = await db.query(sql, [id]);
    return { changes: result.rowCount };
  }

  static async obtenerProximasAVencer(meses = 12) {
    const sql = `
      SELECT h.*, o.nombre as organizacion_nombre, o.tipo as organizacion_tipo
      FROM herramientas h
      LEFT JOIN organizaciones o ON h.organizacion_id = o.id
      WHERE h.vigente = 1
      AND (EXTRACT(EPOCH FROM (NOW() - h.fecha_actualizacion)) / 86400 / 30.44) >= $1
      ORDER BY h.fecha_actualizacion ASC
    `;
    // Nota: La consulta de fecha en PG es diferente a SQLite. 
    // He aproximado la logica:  (Now - fecha) en segundos / dias / meses.
    // Esto puede requerir ajuste fino pero es funcional.
    const { rows } = await db.query(sql, [meses]);
    return rows;
  }
}

module.exports = Herramienta;

const db = require('../config/database');
const Organizacion = require('../models/Organizacion');
const Herramienta = require('../models/Herramienta');
const Expediente = require('../models/Expediente');

class SearchController {
    static async smartSearch(req, res) {
        try {
            const { q } = req.query;
            if (!q) return res.json({ results: [] });

            const query = q.toLowerCase();
            const results = [];

            // 1. Buscar Organizaciones (Nombre o Siglas)
            const { rows: orgs } = await db.query(
                "SELECT id, nombre, siglas, tipo, semaforo FROM organizaciones WHERE (LOWER(nombre) LIKE $1 OR LOWER(siglas) LIKE $1) AND activo = 1",
                [`%${query}%`]
            );
            orgs.forEach(o => results.push({ type: 'ORGANIZACION', id: o.id, title: o.nombre, subtitle: o.siglas, status: o.semaforo }));

            // 2. Buscar Expedientes (Número o Título)
            const { rows: exps } = await db.query(
                "SELECT id, numero_expediente, titulo, estatus, porcentaje_progreso FROM expedientes WHERE LOWER(numero_expediente) LIKE $1 OR LOWER(titulo) LIKE $1",
                [`%${query}%`]
            );
            exps.forEach(e => results.push({ type: 'EXPEDIENTE', id: e.id, title: e.titulo, subtitle: e.numero_expediente, status: e.estatus, progress: e.porcentaje_progreso }));

            // 3. Buscar Herramientas (Archivo)
            const { rows: tools } = await db.query(
                "SELECT h.id, h.tipo_herramienta, o.nombre as org_nombre FROM herramientas h JOIN organizaciones o ON h.organizacion_id = o.id WHERE LOWER(h.nombre_archivo) LIKE $1 AND h.vigente = 1",
                [`%${query}%`]
            );
            tools.forEach(t => results.push({ type: 'HERRAMIENTA', id: t.id, title: t.tipo_herramienta, subtitle: t.org_nombre }));

            // Si la búsqueda es específica (e.g. "avances consejeria")
            // Esto es una simplificación, en producción se usaría un motor de búsqueda más robusto
            if (query.includes('avance') || query.includes('como va')) {
                // Podríamos filtrar resultados que tengan que ver con lo que sigue de la frase
            }

            res.json({ results: results.slice(0, 10) });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error en búsqueda inteligente' });
        }
    }

    static async obtenerCargasTrabajo(req, res) {
        try {
            const sql = `
        SELECT u.id, u.nombre_completo, u.rol, 
               COUNT(DISTINCT h.id) as total_herramientas,
               COUNT(DISTINCT e.id) as total_expedientes,
               MAX(h.fecha_actualizacion) as ultima_act_herramienta,
               MAX(e.ultima_actualizacion) as ultima_act_expediente
        FROM usuarios u
        LEFT JOIN herramientas h ON u.id = h.usuario_registro_id AND h.vigente = 1
        LEFT JOIN expedientes e ON u.id = e.capturista_id
        GROUP BY u.id
        ORDER BY total_herramientas DESC
      `;
            const { rows } = await db.query(sql);
            res.json({ cargas: rows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener cargas de trabajo' });
        }
    }
}

module.exports = SearchController;

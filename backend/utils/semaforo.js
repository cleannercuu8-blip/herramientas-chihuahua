const Herramienta = require('../models/Herramienta');

/**
 * Calcula el estatus de semáforo para una organización
 * basado en sus herramientas organizacionales
 * 
 * Reglas:
 * - VERDE: Todo actualizado desde 2022
 * - AMARILLO: Algunas herramientas desactualizadas
 * - ROJO: Incumplimiento grave o sin publicación POE
 */
class SemaforoService {

    /**
     * Calcula puntos y colores para el nuevo tablero de control (5 puntos)
     * @param {number} organizacionId 
     * @returns {Promise<Object>}
     */
    static async calcularSemaforoCincoPuntos(organizacionId) {
        try {
            const Herramienta = require('../models/Herramienta');
            const herramientas = await Herramienta.obtenerPorOrganizacion(organizacionId);

            // 1. Organigrama
            const org = herramientas.find(h => h.tipo_herramienta === 'ORGANIGRAMA');
            const p1 = this.evaluarFecha(org);

            // 2. Reglamento / Estatuto (Unificado)
            const reg = herramientas.find(h => h.tipo_herramienta === 'REGLAMENTO_ESTATUTO' || h.tipo_herramienta === 'REGLAMENTO_INTERIOR' || h.tipo_herramienta === 'ESTATUTO_ORGANICO');
            const p2 = this.evaluarReglamento(reg, org);

            // 3. Manual de Organización
            const mOrg = herramientas.find(h => h.tipo_herramienta === 'MANUAL_ORGANIZACION');
            const p3 = this.evaluarFecha(mOrg);

            // 4. Manual de Procedimientos
            const mProc = herramientas.find(h => h.tipo_herramienta === 'MANUAL_PROCEDIMIENTOS');
            const p4 = this.evaluarFecha(mProc);

            // 5. Manual de Servicios (Condicional)
            const mServ = herramientas.find(h => h.tipo_herramienta === 'MANUAL_SERVICIOS');
            const p5 = mServ ? this.evaluarFecha(mServ) : null;

            return {
                puntos: [p1, p2, p3, p4, p5].filter(p => p !== null),
                tieneServicios: !!mServ
            };
        } catch (error) {
            console.error('Error en calcularSemaforoCincoPuntos:', error);
            throw error;
        }
    }

    /**
     * Regla General de Fechas:
     * Verde: >= 2022
     * Amarillo: 2018 - 2021
     * Rojo: < 2018 o no existe
     */
    static evaluarFecha(herramienta) {
        if (!herramienta || !herramienta.fecha_emision) return 'ROJO';
        const año = new Date(herramienta.fecha_emision).getFullYear();
        if (año >= 2022) return 'VERDE';
        if (año >= 2018) return 'AMARILLO';
        return 'ROJO';
    }

    /**
     * Regla Especial Reglamento:
     * Verde: >= 2022
     * Amarillo: Publicado AND (Fecha Reglamento > Fecha Organigrama)
     * Naranja: Published, 2018-2021 (Si no cumple amarillo)
     * Rojo: < 2018 o no existe
     */
    static evaluarReglamento(reg, organigrama) {
        if (!reg || !reg.fecha_emision) return 'ROJO';
        const añoReg = new Date(reg.fecha_emision).getFullYear();

        if (añoReg >= 2022) return 'VERDE';

        // Lógica de "más actualizado que su organigrama"
        if (organigrama && organigrama.fecha_emision) {
            const fReg = new Date(reg.fecha_emision);
            const fOrg = new Date(organigrama.fecha_emision);
            if (fReg > fOrg) return 'AMARILLO';
        }

        if (añoReg >= 2018) return 'NARANJA';

        return 'ROJO';
    }

    /**
     * Mantiene compatibilidad con el sistema anterior pero usa la nueva lógica interna
     */
    static async calcularEstatus(organizacionId, tipoOrganizacion) {
        const resultado = await this.calcularSemaforoCincoPuntos(organizacionId);

        // Determinar color global (el peor color manda para el estatus de la lista)
        const colores = resultado.puntos;
        let global = 'VERDE';
        if (colores.includes('ROJO')) global = 'ROJO';
        else if (colores.includes('NARANJA')) global = 'ROJO'; // Naranja se considera incumplimiento en el global
        else if (colores.includes('AMARILLO')) global = 'AMARILLO';

        return {
            estatus: global,
            detalles: {
                puntos: resultado.puntos,
                tieneServicios: resultado.tieneServicios,
                mensaje: `Evaluación de ${resultado.puntos.length} herramientas críticas`
            }
        };
    }

    static async actualizarCacheSemaforo(organizacionId) {
        try {
            const Organizacion = require('../models/Organizacion');
            const org = await Organizacion.obtenerPorId(organizacionId);
            if (!org) return;

            const semaforo = await this.calcularEstatus(organizacionId, org.tipo);
            await Organizacion.actualizarSemaforoCache(organizacionId, semaforo.estatus, semaforo.detalles);
            return semaforo;
        } catch (error) {
            console.error('Error al actualizar caché de semáforo:', error);
        }
    }
    /**
     * Obtiene estadísticas generales de semáforo
     */
    static async obtenerEstadisticasGenerales() {
        const db = require('../config/database');
        const sql = `
            SELECT 
                o.tipo,
                COUNT(o.id) as total
            FROM organizaciones o
            WHERE o.activo = 1
            GROUP BY o.tipo
        `;
        const { rows } = await db.query(sql);
        return rows;
    }
}

module.exports = SemaforoService;

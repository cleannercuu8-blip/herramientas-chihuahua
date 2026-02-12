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
     * Calcula semáforo basado en el conteo de herramientas registradas
     * @param {number} organizacionId 
     * @returns {Promise<Object>}
     */
    static async calcularSemaforoCincoPuntos(organizacionId) {
        try {
            const Organizacion = require('../models/Organizacion');
            const Herramienta = require('../models/Herramienta');

            const orgData = await Organizacion.obtenerPorId(organizacionId);
            const herramientas = await Herramienta.obtenerPorOrganizacion(organizacionId);

            // Contar herramientas únicas por tipo
            const tiposUnicos = new Set();
            herramientas.forEach(h => {
                if (h.tipo_herramienta) {
                    tiposUnicos.add(h.tipo_herramienta);
                }
            });

            const cantidadHerramientas = tiposUnicos.size;

            // Determinar total esperado
            const totalEsperado = (orgData && orgData.requiere_manual_servicios) ? 5 : 4;

            return {
                cantidadHerramientas,
                totalEsperado,
                tieneServicios: orgData && orgData.requiere_manual_servicios
            };
        } catch (error) {
            console.error('Error en calcularSemaforoCincoPuntos:', error);
            throw error;
        }
    }

    /**
     * Regla de colores basada en cantidad de herramientas:
     * 1 herramienta → ROJO
     * 2 herramientas → NARANJA (oscuro)
     * 3 herramientas → NARANJA (claro)
     * 4 herramientas → AMARILLO
     * 5+ herramientas → VERDE
     */
    static determinarColorPorCantidad(cantidad, totalEsperado) {
        if (totalEsperado === 5) {
            if (cantidad >= 5) return 'VERDE';
            if (cantidad === 4) return 'AMARILLO';
            if (cantidad === 3) return 'NARANJA_CLARO';
            if (cantidad === 2) return 'NARANJA_FUERTE';
            return 'ROJO';
        } else {
            // Caso 4 herramientas (o cualquier otro <=4)
            if (cantidad >= 4) return 'VERDE';
            if (cantidad === 3) return 'AMARILLO';
            if (cantidad === 2) return 'NARANJA';
            return 'ROJO';
        }
    }

    /**
     * Mantiene compatibilidad con el sistema anterior pero usa la nueva lógica interna
     */
    static async calcularEstatus(organizacionId, tipoOrganizacion) {
        const resultado = await this.calcularSemaforoCincoPuntos(organizacionId);
        const color = this.determinarColorPorCantidad(resultado.cantidadHerramientas, resultado.totalEsperado);

        // Obtener herramientas para saber cuáles específicamente tiene
        const Herramienta = require('../models/Herramienta');
        const herramientas = await Herramienta.obtenerPorOrganizacion(organizacionId);
        const tipos = herramientas.map(h => h.tipo_herramienta);

        // Mapeo para el dashboard (0: Organigrama, 1: Reglamento/Estatuto, 2: Man Org, 3: Man Proc)
        const puntos = [
            tipos.includes('ORGANIGRAMA') ? 'verde' : 'rojo',
            (tipos.includes('REGLAMENTO_INTERIOR') || tipos.includes('ESTATUTO_ORGANICO') || tipos.includes('REGLAMENTO_ESTATUTO')) ? 'verde' : 'rojo',
            tipos.includes('MANUAL_ORGANIZACION') ? 'verde' : 'rojo',
            tipos.includes('MANUAL_PROCEDIMIENTOS') ? 'verde' : 'rojo'
        ];

        return {
            estatus: color,
            detalles: {
                cantidadHerramientas: resultado.cantidadHerramientas,
                totalEsperado: resultado.totalEsperado,
                tieneServicios: resultado.tieneServicios,
                puntos: puntos, // Para las barras del dashboard
                mensaje: `${resultado.cantidadHerramientas} de ${resultado.totalEsperado} herramientas registradas`
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

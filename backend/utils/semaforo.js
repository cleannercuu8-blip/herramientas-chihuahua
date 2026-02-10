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
     * Calcula el estatus de semáforo para una organización
     * @param {number} organizacionId - ID de la organización
     * @param {string} tipoOrganizacion - DEPENDENCIA o ENTIDAD_PARAESTATAL
     * @returns {Promise<Object>} - { estatus: 'VERDE'|'AMARILLO'|'ROJO', detalles: {...} }
     */
    static async calcularEstatus(organizacionId, tipoOrganizacion) {
        try {
            const herramientas = await Herramienta.obtenerPorOrganizacion(organizacionId);

            if (herramientas.length === 0) {
                return {
                    estatus: 'ROJO',
                    detalles: {
                        mensaje: 'No hay herramientas registradas',
                        herramientasFaltantes: this.obtenerHerramientasObligatorias(tipoOrganizacion)
                    }
                };
            }

            // Verificar herramientas obligatorias
            const validacion = this.validarHerramientasObligatorias(herramientas, tipoOrganizacion);
            if (!validacion.cumple) {
                return {
                    estatus: 'ROJO',
                    detalles: {
                        mensaje: 'Faltan herramientas obligatorias',
                        herramientasFaltantes: validacion.faltantes
                    }
                };
            }

            // Verificar publicación en POE
            const validacionPOE = this.validarPublicacionPOE(herramientas, tipoOrganizacion);
            if (!validacionPOE.cumple) {
                return {
                    estatus: 'ROJO',
                    detalles: {
                        mensaje: 'Falta publicación en Periódico Oficial del Estado',
                        herramientasSinPOE: validacionPOE.sinPOE
                    }
                };
            }

            // Verificar antigüedad de documentos (desde 2022)
            const analisisAntiguedad = this.analizarAntiguedad(herramientas);

            if (analisisAntiguedad.criticas > 0) {
                return {
                    estatus: 'ROJO',
                    detalles: {
                        mensaje: 'Herramientas desactualizadas (anteriores a 2022)',
                        herramientasDesactualizadas: analisisAntiguedad.listaCriticas
                    }
                };
            }

            if (analisisAntiguedad.advertencias > 0) {
                return {
                    estatus: 'AMARILLO',
                    detalles: {
                        mensaje: 'Algunas herramientas requieren actualización',
                        herramientasAdvertencia: analisisAntiguedad.listaAdvertencias
                    }
                };
            }

            return {
                estatus: 'VERDE',
                detalles: {
                    mensaje: 'Todas las herramientas están actualizadas',
                    totalHerramientas: herramientas.length
                }
            };

        } catch (error) {
            console.error('Error al calcular estatus de semáforo:', error);
            throw error;
        }
    }

    /**
     * Recalcula el semáforo y actualiza la caché en la base de datos
     * @param {number} organizacionId 
     */
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
     * Obtiene las herramientas obligatorias según el tipo de organización
     */
    static obtenerHerramientasObligatorias(tipoOrganizacion) {
        const obligatorias = ['ORGANIGRAMA', 'MANUAL_ORGANIZACION'];

        if (tipoOrganizacion === 'DEPENDENCIA') {
            obligatorias.push('REGLAMENTO_INTERIOR');
        } else if (tipoOrganizacion === 'ENTIDAD_PARAESTATAL') {
            obligatorias.push('ESTATUTO_ORGANICO');
        }

        return obligatorias;
    }

    /**
     * Valida que existan las herramientas obligatorias
     */
    static validarHerramientasObligatorias(herramientas, tipoOrganizacion) {
        const obligatorias = this.obtenerHerramientasObligatorias(tipoOrganizacion);
        const tiposPresentes = herramientas.map(h => h.tipo_herramienta);

        const faltantes = obligatorias.filter(tipo => !tiposPresentes.includes(tipo));

        return {
            cumple: faltantes.length === 0,
            faltantes
        };
    }

    /**
     * Valida que Reglamento/Estatuto estén publicados en POE
     */
    static validarPublicacionPOE(herramientas, tipoOrganizacion) {
        const tipoRequerido = tipoOrganizacion === 'DEPENDENCIA'
            ? 'REGLAMENTO_INTERIOR'
            : 'ESTATUTO_ORGANICO';

        const herramientaPOE = herramientas.find(h => h.tipo_herramienta === tipoRequerido);

        if (!herramientaPOE) {
            return { cumple: false, sinPOE: [tipoRequerido] };
        }

        if (!herramientaPOE.fecha_publicacion_poe) {
            return {
                cumple: false,
                sinPOE: [{
                    tipo: tipoRequerido,
                    nombre: herramientaPOE.nombre_archivo
                }]
            };
        }

        return { cumple: true, sinPOE: [] };
    }

    /**
     * Analiza la antigüedad de las herramientas
     * Criterio: Deben ser de 2022 en adelante
     */
    static analizarAntiguedad(herramientas) {
        const fechaBase = new Date('2022-01-01');
        const hoy = new Date();

        let criticas = 0;
        let advertencias = 0;
        const listaCriticas = [];
        const listaAdvertencias = [];

        herramientas.forEach(h => {
            const fechaActualizacion = h.fecha_actualizacion ? new Date(h.fecha_actualizacion) : null;
            const fechaEmision = h.fecha_emision ? new Date(h.fecha_emision) : null;

            // Al cargar tools anteriores sin fechas válidas, evitar marcarlas todas como críticas si no es necesario
            if ((!fechaActualizacion || isNaN(fechaActualizacion.getTime())) &&
                (!fechaEmision || isNaN(fechaEmision.getTime()))) {
                // Si no hay ninguna fecha válida, por seguridad es CRÍTICO pero lo manejamos
                criticas++;
                listaCriticas.push({
                    tipo: h.tipo_herramienta,
                    nombre: h.nombre_archivo,
                    fecha: 'Sin fecha',
                    mensaje: 'Documento sin fecha válida'
                });
                return;
            }

            // Usar la fecha más reciente entre emisión y actualización
            const fA = fechaActualizacion && !isNaN(fechaActualizacion.getTime()) ? fechaActualizacion : new Date(0);
            const fE = fechaEmision && !isNaN(fechaEmision.getTime()) ? fechaEmision : new Date(0);
            const fechaReferencia = fA > fE ? fA : fE;

            // Si es anterior a 2022 = CRÍTICO
            if (fechaReferencia < fechaBase) {
                criticas++;
                listaCriticas.push({
                    tipo: h.tipo_herramienta,
                    nombre: h.nombre_archivo,
                    fecha: fechaReferencia.toISOString().split('T')[0],
                    antiguedad: this.calcularAntiguedad(fechaReferencia, hoy)
                });
            }
            // Si tiene más de 2 años desde 2022 = ADVERTENCIA
            else {
                const mesesAntiguedad = this.calcularMeses(fechaReferencia, hoy);
                if (mesesAntiguedad > 24) {
                    advertencias++;
                    listaAdvertencias.push({
                        tipo: h.tipo_herramienta,
                        nombre: h.nombre_archivo,
                        fecha: fechaReferencia.toISOString().split('T')[0],
                        mesesAntiguedad
                    });
                }
            }
        });

        return {
            criticas,
            advertencias,
            listaCriticas,
            listaAdvertencias
        };
    }

    /**
     * Calcula meses entre dos fechas
     */
    static calcularMeses(fecha1, fecha2) {
        const diffTime = Math.abs(fecha2 - fecha1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.floor(diffDays / 30.44);
    }

    /**
     * Calcula antigüedad en formato legible
     */
    static calcularAntiguedad(fecha1, fecha2) {
        const meses = this.calcularMeses(fecha1, fecha2);
        const años = Math.floor(meses / 12);
        const mesesRestantes = meses % 12;

        if (años > 0) {
            return `${años} año${años > 1 ? 's' : ''} ${mesesRestantes} mes${mesesRestantes !== 1 ? 'es' : ''}`;
        }
        return `${meses} mes${meses !== 1 ? 'es' : ''}`;
    }

    /**
     * Obtiene estadísticas generales de semáforo
     */
    static async obtenerEstadisticasGenerales() {
        const db = require('../config/database');

        return new Promise((resolve, reject) => {
            const sql = `
        SELECT 
          o.tipo,
          COUNT(o.id) as total
        FROM organizaciones o
        WHERE o.activo = 1
        GROUP BY o.tipo
      `;

            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

module.exports = SemaforoService;

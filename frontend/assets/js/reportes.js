// Módulo de reportes
const ReportesModule = {
    // Exportar inventario completo
    exportarInventario() {
        const url = `${window.AppUtils.API_URL}/reportes/exportar/inventario`;
        window.open(url + `?token=${window.AppUtils.AppState.token}`, '_blank');
    },

    // Exportar reporte de semáforo
    exportarSemaforo() {
        const url = `${window.AppUtils.API_URL}/reportes/exportar/semaforo`;
        window.open(url + `?token=${window.AppUtils.AppState.token}`, '_blank');
    },

    // Exportar herramientas próximas a vencer
    exportarProximasVencer(meses = 12) {
        const url = `${window.AppUtils.API_URL}/reportes/exportar/proximas-vencer?meses=${meses}`;
        window.open(url + `?token=${window.AppUtils.AppState.token}`, '_blank');
    },

    // Obtener historial
    async obtenerHistorial(limite = 100) {
        try {
            const data = await window.AppUtils.fetchAPI(`/reportes/historial?limite=${limite}`);
            return { success: true, data: data.historial };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

window.ReportesModule = ReportesModule;

// Módulo de reportes
const ReportesModule = {
    // Exportar inventario completo
    exportarInventario() {
        const token = window.AppUtils.AppState.token || localStorage.getItem('token');
        window.open(url + `?token=${token}`, '_blank');
    },

    // Exportar reporte de semáforo
    exportarSemaforo() {
        const token = window.AppUtils.AppState.token || localStorage.getItem('token');
        window.open(url + `?token=${token}`, '_blank');
    },

    // Exportar herramientas próximas a vencer
    exportarProximasVencer(meses = 12) {
        const token = window.AppUtils.AppState.token || localStorage.getItem('token');
        window.open(url + `&token=${token}`, '_blank');
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

// Módulo de organizaciones
const OrganizacionesModule = {
    // Obtener todas las organizaciones
    async obtenerTodas(tipo = null, limite = null, offset = null) {
        const params = new URLSearchParams();
        if (tipo) params.append('tipo', tipo);
        if (limite) params.append('limite', limite);
        if (offset) params.append('offset', offset);

        try {
            const endpoint = `/organizaciones?${params.toString()}`;
            const data = await window.AppUtils.fetchAPI(endpoint);
            return { success: true, data: data.organizaciones };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Obtener organización por ID
    async obtenerPorId(id) {
        try {
            const data = await window.AppUtils.fetchAPI(`/organizaciones/${id}`);
            return { success: true, data: data.organizacion };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Crear organización
    async crear(organizacion) {
        try {
            const data = await window.AppUtils.fetchAPI('/organizaciones', {
                method: 'POST',
                body: JSON.stringify(organizacion)
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Actualizar organización
    async actualizar(id, organizacion) {
        try {
            const data = await window.AppUtils.fetchAPI(`/organizaciones/${id}`, {
                method: 'PUT',
                body: JSON.stringify(organizacion)
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Eliminar organización
    async eliminar(id) {
        try {
            const data = await window.AppUtils.fetchAPI(`/organizaciones/${id}`, {
                method: 'DELETE'
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Obtener estadísticas
    async obtenerEstadisticas() {
        try {
            const data = await window.AppUtils.fetchAPI('/organizaciones/estadisticas');
            return { success: true, data: data.estadisticas };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

window.OrganizacionesModule = OrganizacionesModule;

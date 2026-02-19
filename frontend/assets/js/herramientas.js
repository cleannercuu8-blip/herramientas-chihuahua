// Módulo de herramientas
const HerramientasModule = {
    // Obtener todas las herramientas
    async obtenerTodas(organizacionId = null) {
        try {
            const endpoint = organizacionId
                ? `/herramientas?organizacion_id=${organizacionId}`
                : '/herramientas';
            const res = await window.AppUtils.fetchAPI(endpoint);
            return { success: true, data: res.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Obtener herramienta por ID
    async obtenerPorId(id) {
        try {
            const res = await window.AppUtils.fetchAPI(`/herramientas/${id}`);
            return { success: true, data: res.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Crear herramienta con archivo
    async crear(formData) {
        try {
            const res = await window.AppUtils.fetchAPIWithFile('/herramientas', formData);
            return { success: true, data: res.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Actualizar herramienta
    async actualizar(id, formData) {
        try {
            formData.append('_method', 'PUT');
            const response = await fetch(`${window.AppUtils.API_URL}/herramientas/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${window.AppUtils.AppState.token}`
                },
                body: formData
            });

            const res = await response.json();

            if (!response.ok) {
                throw new Error(res.error || 'Error al actualizar');
            }

            return { success: true, data: res.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Eliminar herramienta
    async eliminar(id) {
        try {
            const res = await window.AppUtils.fetchAPI(`/herramientas/${id}`, {
                method: 'DELETE'
            });
            return { success: true, data: res.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Obtener herramientas próximas a vencer
    async obtenerProximasVencer(meses = 12) {
        try {
            const res = await window.AppUtils.fetchAPI(`/herramientas/proximas-vencer?meses=${meses}`);
            return { success: true, data: res.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Descargar archivo
    getUrlDescarga(id) {
        return `${window.AppUtils.API_URL}/herramientas/${id}/descargar?token=${window.AppUtils.AppState.token}`;
    }
};

window.HerramientasModule = HerramientasModule;


// Nota: Las funciones toggleCamposManual y toggleInputsManual se movieron a app.js
// para centralizar la lógica de la UI y evitar duplicidad.

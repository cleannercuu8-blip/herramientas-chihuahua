// Módulo de herramientas
const HerramientasModule = {
    // Obtener todas las herramientas
    async obtenerTodas(organizacionId = null) {
        try {
            const endpoint = organizacionId
                ? `/herramientas?organizacion_id=${organizacionId}`
                : '/herramientas';
            const data = await window.AppUtils.fetchAPI(endpoint);
            return { success: true, data: data.herramientas };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Obtener herramienta por ID
    async obtenerPorId(id) {
        try {
            const data = await window.AppUtils.fetchAPI(`/herramientas/${id}`);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Crear herramienta con archivo
    async crear(formData) {
        try {
            const data = await window.AppUtils.fetchAPIWithFile('/herramientas', formData);
            return { success: true, data };
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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al actualizar');
            }

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Eliminar herramienta
    async eliminar(id) {
        try {
            const data = await window.AppUtils.fetchAPI(`/herramientas/${id}`, {
                method: 'DELETE'
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Obtener herramientas próximas a vencer
    async obtenerProximasVencer(meses = 12) {
        try {
            const data = await window.AppUtils.fetchAPI(`/herramientas/proximas-vencer?meses=${meses}`);
            return { success: true, data: data.herramientas };
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

// Funciones globales para la UI de Herramientas
window.toggleCamposManual = function (tipo) {
    const manualServiciosSection = document.getElementById('pregunta-manual-servicios');
    if (!manualServiciosSection) return;

    if (tipo === 'MANUAL_SERVICIOS') {
        manualServiciosSection.classList.remove('hidden');
        // Ocultar campos de archivo hasta que respondan SI
        document.getElementById('campos-herramienta-archivo').classList.add('hidden');
        // Reset radios
        document.querySelectorAll('input[name="req_manual"]').forEach(el => el.checked = false);
    } else {
        manualServiciosSection.classList.add('hidden');
        document.getElementById('campos-herramienta-archivo').classList.remove('hidden');
    }
};

window.toggleInputsManual = function (requiere) {
    const camposArchivo = document.getElementById('campos-herramienta-archivo');
    if (requiere) {
        camposArchivo.classList.remove('hidden');
        document.getElementById('input-archivo-herramienta').required = true;
    } else {
        camposArchivo.classList.add('hidden');
        document.getElementById('input-archivo-herramienta').required = false;
        // Si no requiere, se podría asumir que se guarda vacio o se maneja diferente.
        // Por ahora solo ocultamos.
    }
};

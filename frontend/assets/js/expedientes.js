const ExpedientesModule = {
    async obtenerTodos() {
        try {
            const response = await fetch('/api/expedientes', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return await response.json();
        } catch (error) {
            console.error(error);
            return { expedientes: [] };
        }
    },

    async crear(datos) {
        try {
            const response = await fetch('/api/expedientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(datos)
            });
            return await response.json();
        } catch (error) {
            console.error(error);
            return { error: 'Error al crear expediente' };
        }
    },

    renderizarLista(expedientes) {
        const container = document.getElementById('expedientes-lista');
        if (!container) return;

        if (expedientes.length === 0) {
            container.innerHTML = '<p class="text-center p-20">No hay expedientes registrados.</p>';
            return;
        }

        container.innerHTML = expedientes.map(exp => `
            <div class="expediente-card exp-status-${exp.estatus.toLowerCase()}" onclick="ExpedientesModule.verDetalle(${exp.id})">
                <div class="exp-header">
                    <span class="exp-num">${exp.numero_expediente}</span>
                    <span class="exp-prioridad priority-${exp.prioridad}">${exp.prioridad}</span>
                </div>
                <h4 class="mb-5">${exp.titulo}</h4>
                <div class="exp-progreso-wrapper">
                    <div class="exp-progreso-header">
                        <span>Progreso: ${exp.porcentaje_progreso}%</span>
                        <span>${exp.estatus}</span>
                    </div>
                    <div class="exp-progreso-bar">
                        <div class="exp-progreso-fill" style="width: ${exp.porcentaje_progreso}%"></div>
                    </div>
                </div>
                <div class="exp-footer">
                    <span class="exp-org">🏢 ${exp.organizacion_nombre}</span>
                    <small>${new Date(exp.ultima_actualizacion).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    },

    verDetalle(id) {
        console.log('Ver detalle de expediente:', id);
        // Implementar modal de detalle
    }
};

window.ExpedientesModule = ExpedientesModule;

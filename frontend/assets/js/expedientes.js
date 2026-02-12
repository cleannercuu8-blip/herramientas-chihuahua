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

    async cargarOrganizaciones() {
        const select = document.getElementById('select-organizacion-expediente');
        if (!select) return;

        try {
            select.innerHTML = '<option value="">Cargando...</option>';
            // Reutilizar la lógica de organizaciones si es posible, o hacer fetch directo
            const response = await fetch('/api/organizaciones', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            const organizaciones = data.organizaciones || [];

            if (organizaciones.length > 0) {
                select.innerHTML = '<option value="">Seleccione una dependencia...</option>' +
                    organizaciones.map(org => `<option value="${org.id}">${org.nombre}</option>`).join('');
            } else {
                select.innerHTML = '<option value="">No hay dependencias registradas</option>';
            }
        } catch (error) {
            console.error('Error cargando organizaciones para expediente:', error);
            select.innerHTML = '<option value="">Error al cargar</option>';
        }
    },

    prepararNuevo() {
        this.cargarOrganizaciones();
        window.mostrarModal('modal-nuevo-expediente');
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

        console.log('Renderizando expedientes:', expedientes);
        if (!expedientes || expedientes.length === 0) {
            container.innerHTML = '<p class="text-center p-20">No hay expedientes registrados.</p>';
            return;
        }

        container.innerHTML = expedientes.map(exp => {
            const statusClass = exp.estatus ? `exp-status-${exp.estatus.toLowerCase()}` : 'exp-status-abierto';
            const priorityClass = exp.prioridad ? `priority-${exp.prioridad}` : 'priority-media';
            const progress = exp.porcentaje_progreso || 0;

            return `
            <div class="expediente-card ${statusClass}" onclick="ExpedientesModule.verDetalle(${exp.id})">
                <div class="exp-header">
                    <span class="exp-num">${exp.numero_expediente || 'S/N'}</span>
                    <span class="exp-prioridad ${priorityClass}">${exp.prioridad || 'MEDIA'}</span>
                </div>
                <h4 class="mb-5">${exp.titulo}</h4>
                <div class="exp-progreso-wrapper">
                    <div class="exp-progreso-header">
                        <span>Progreso: ${progress}%</span>
                        <span>${exp.estatus || 'ABIERTO'}</span>
                    </div>
                    <div class="exp-progreso-bar">
                        <div class="exp-progreso-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="exp-footer">
                    <span class="exp-org">🏢 ${exp.organizacion_nombre}</span>
                    <small>${new Date(exp.ultima_actualizacion).toLocaleDateString()}</small>
                </div>
            </div>
        `;
        }).join('');
    },

    currentExpedienteId: null,

    async verDetalle(id) {
        this.currentExpedienteId = id;
        const modal = document.getElementById('modal-detalle-expediente');
        const timelineContainer = document.getElementById('expediente-timeline');

        // Reset steps
        timelineContainer.innerHTML = '<p class="text-center">Cargando...</p>';
        window.mostrarModal('modal-detalle-expediente');

        // Call the new function here
        await this.cargarOrganizaciones();

        try {
            const response = await fetch(`/api/expedientes/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();


            if (data.error) throw new Error(data.error);

            const { expediente, avances } = data;

            // Header
            document.getElementById('detalle-exp-titulo').textContent = expediente.titulo;
            document.getElementById('detalle-exp-subtitulo').textContent = `${expediente.numero_expediente} | ${expediente.organizacion_nombre}`;

            // Render Timeline
            this.renderTimeline(avances || []);

            // Initial date in form
            document.querySelector('#form-nuevo-avance input[name="fecha"]').valueAsDate = new Date();

        } catch (error) {
            console.error(error);
            alert('Error al cargar expediente');
        }
    },

    renderTimeline(avances) {
        const container = document.getElementById('expediente-timeline');
        if (avances.length === 0) {
            container.innerHTML = '<p class="text-center text-muted p-20">No hay avances registrados.</p>';
            return;
        }

        container.innerHTML = avances.map(av => `
            <div class="timeline-item">
                <div class="timeline-marker ${av.tipo.toLowerCase()}"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-date">${new Date(av.fecha).toLocaleDateString()}</span>
                        <span class="timeline-type badge badge-${av.tipo.toLowerCase()}">${av.tipo}</span>
                    </div>
                    <h5 class="timeline-title">${av.titulo}</h5>
                    ${av.descripcion ? `<p>${av.descripcion}</p>` : ''}
                    <small class="text-muted">Por: ${av.usuario_nombre}</small>
                </div>
            </div>
        `).join('');
    },

    async handleAgregarAvance(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (!this.currentExpedienteId) return;

        try {
            const response = await fetch(`/api/expedientes/${this.currentExpedienteId}/avances`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                form.reset();
                this.verDetalle(this.currentExpedienteId); // Reload
            } else {
                alert('Error al registrar avance');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        }
    },

    async descargarPDF() {
        // Since the user wants the organization report to include expediente info, we redirect to the Org PDF
        // First we need the org ID from the current expediente
        // Optimally we request the expediente details again or store the org ID

        // For now, let's assume we want to download the ORGANIZATION report for this expediente
        // We need to fetch the expediente first to get org_id if not stored
        try {
            const response = await fetch(`/api/expedientes/${this.currentExpedienteId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (data.expediente) {
                window.open(`/api/reportes/organizacion/${data.expediente.organizacion_id}/pdf`, '_blank');
            }
        } catch (e) { console.error(e); }
    },
    // Función para cargar la lista principal desde el menú
    async cargarExpedientes() {
        const container = document.getElementById('expedientes-lista');
        if (!container) return;

        container.innerHTML = '<div class="spinner"></div>';

        try {
            const data = await this.obtenerTodos();
            if (data.expedientes) {
                this.renderizarLista(data.expedientes);
            } else {
                container.innerHTML = '<p class="text-center p-20 text-error">Error al cargar expedientes.</p>';
            }
        } catch (error) {
            console.error('Error al cargar expedientes:', error);
            container.innerHTML = '<p class="text-center p-20 text-error">Error de conexión.</p>';
        }
    }
};

window.ExpedientesModule = ExpedientesModule;
window.cargarExpedientes = () => ExpedientesModule.cargarExpedientes();

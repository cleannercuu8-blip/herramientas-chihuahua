const ExpedientesModule = {
    async obtenerTodos() {
        try {
            return await window.AppUtils.fetchAPI('/expedientes');
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
            const data = await window.AppUtils.fetchAPI('/organizaciones');
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
            return await window.AppUtils.fetchAPI('/expedientes', {
                method: 'POST',
                body: JSON.stringify(datos)
            });
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
            const data = await window.AppUtils.fetchAPI(`/expedientes/${id}`);

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
            const response = await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}/avances`, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response && !response.error) {
                form.reset();
                this.verDetalle(this.currentExpedienteId); // Reload
            } else {
                alert('Error al registrar avance');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión o permisos');
        }
    },

    async descargarPDF() {
        try {
            const data = await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}`);
            if (data.expediente) {
                const token = window.AppUtils.AppState.token; // Use correct token source
                window.open(`/api/reportes/organizacion/${data.expediente.organizacion_id}/pdf?token=${token}`, '_blank');
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
    },

    // Nueva función para renderizar dentro del detalle de organización (VISTA RESUMIDA)
    async renderizarEnDetalleOrganizacion(organizacionId, containerId = 'detalle-org-expediente-content') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div class="spinner"></div>';
        this.currentExpedienteId = null;

        try {
            const data = await window.AppUtils.fetchAPI(`/expedientes?organizacion_id=${organizacionId}`);
            const expedientes = data.expedientes || [];

            if (expedientes.length > 0) {
                const expediente = expedientes[0];
                this.currentExpedienteId = expediente.id;

                // Mostrar resumen
                container.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div>
                            <h5 style="margin: 0; color: var(--azul-institucional); font-size: 1rem;">${expediente.numero_expediente}</h5>
                            <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #64748b;">${expediente.titulo}</p>
                            <div style="margin-top: 5px;">
                                <span class="badge ${expediente.estatus === 'ABIERTO' ? 'badge-verde' : 'badge-rojo'}">${expediente.estatus}</span>
                            </div>
            container.innerHTML = '<p class="text-error">Error al cargar información del expediente.</p>';
        }
    },

    async crearExpedienteRapido(organizacionId, containerId) {
        if (!confirm('¿Desea abrir un nuevo expediente de seguimiento para esta dependencia?')) return;

        try {
            // 1. Obtener detalles de la organización para las siglas
            const orgData = await window.AppUtils.fetchAPI(`/ organizaciones / ${ organizacionId } `);
            if (!orgData || !orgData.organizacion) throw new Error('No se pudo obtener datos de la organización');

            const siglas = orgData.organizacion.siglas || 'S-N';
            const anio = new Date().getFullYear();
            const folio = `EXP - DSIJ - ${ siglas } -${ anio } `;

            // 2. Crear expediente
            const datos = {
                titulo: 'Seguimiento General',
                numero_expediente: folio,
                organizacion_id: organizacionId,
                prioridad: 'MEDIA',
                estatus: 'ABIERTO',
                descripcion: 'Expediente generado automáticamente para seguimiento.'
            };

            const resultado = await this.crear(datos);
            if (resultado && !resultado.error) {
                this.renderizarEnDetalleOrganizacion(organizacionId, containerId);
            } else {
                alert('Error al crear expediente: ' + (resultado.error || 'Desconocido'));
            }
        } catch (error) {
            console.error(error);
            alert('Error al procesar: ' + error.message);
            this.verDetalle(this.currentExpedienteId);

            // Actualizar vista resumida también si está visible
            const resumenContainer = document.getElementById('detalle-org-expediente-content');
            if (resumenContainer && !resumenContainer.innerHTML.includes('Activar Expediente')) {
                // No action needed really, main view updates on next verify
            }

        } else {
            alert('Error al eliminar: ' + (response ? response.error : 'Desconocido'));
            }
        } catch (e) { console.error(e); alert('Error de conexión'); }
    },
    
    async verDetalle(id) {
    this.currentExpedienteId = id;

    // 1. Full Screen / Larger Modal
    const modal = document.getElementById('modal-detalle-expediente');
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) modalContent.style.maxWidth = '95%';

    window.mostrarModal('modal-detalle-expediente');
    const timelineContainer = document.getElementById('expediente-timeline');
    timelineContainer.innerHTML = '<p class="text-center">Cargando...</p>';

    try {
        const data = await window.AppUtils.fetchAPI(`/ expedientes / ${ id } `);
        if (data.error) throw new Error(data.error);

        const { expediente, avances } = data;

        // Header
        document.getElementById('detalle-exp-titulo').textContent = expediente.titulo;
        document.getElementById('detalle-exp-subtitulo').textContent = `${ expediente.numero_expediente } | ${ expediente.organizacion_nombre } `;

        // Render Timeline
        this.renderTimeline(avances || []);

        // Initial date in form
        const dateInput = document.querySelector('#form-nuevo-avance input[name="fecha"]');
        if (dateInput) dateInput.valueAsDate = new Date();

        // Footer Logic: Close vs Reopen
        const footer = document.querySelector('#modal-detalle-expediente .modal-footer');
        if (footer) {
            let actionBtn = '';
            if (expediente.estatus !== 'CERRADO') {
                actionBtn = `< button class="btn btn-danger" onclick = "window.ExpedientesModule.cerrarExpediente()" style = "margin-right: auto;" >🔒 Cerrar Expediente</button > `;
            } else {
                actionBtn = `< button class="btn btn-warning" onclick = "window.ExpedientesModule.reabrirExpediente()" style = "margin-right: auto; background-color: #f59e0b; color: white;" >↩️ Reabrir Expediente</button > `;
            }

            footer.innerHTML = `
                    ${ actionBtn }
                    <button class="btn btn-secondary" onclick="window.ExpedientesModule.descargarPDF()">📄 Descargar Reporte PDF</button>
                    <button class="btn btn-primary" onclick="cerrarModal('modal-detalle-expediente')">Cerrar Ventana</button>
                `;
        }

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
                    < div class="timeline-item" >
                <div class="timeline-marker ${av.tipo.toLowerCase()}"></div>
                <div class="timeline-content" style="position: relative;">
                    <button class="btn btn-sm btn-action" 
                            style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.2rem; cursor: pointer;" 
                            onclick="ExpedientesModule.eliminarAvance(${av.id})" 
                            title="Eliminar registro">
                        🗑️
                    </button>
                    
                    <div class="timeline-header">
                        <span class="timeline-date">${new Date(av.fecha).toLocaleDateString()}</span>
                        <span class="timeline-type badge badge-${av.tipo.toLowerCase()}">${av.tipo}</span>
                    </div>
                    <h5 class="timeline-title">${av.titulo}</h5>
                    ${av.descripcion ? `<p>${av.descripcion}</p>` : ''}
                    <small class="text-muted" style="display: block; margin-top: 5px;">
                        Por: <strong>${av.usuario_nombre || 'Desconocido'}</strong>
                    </small>
                </div>
            </div >
    `).join('');
},

    async eliminarAvance(avanceId) {
    if (!confirm('¿Seguro que desea eliminar este registro?')) return;

    try {
        const response = await window.AppUtils.fetchAPI(`/ expedientes / ${ this.currentExpedienteId } /avances/${ avanceId } `, {
            method: 'DELETE'
        });

        if (response && !response.error) {
            this.verDetalle(this.currentExpedienteId);

            // Actualizar vista resumida también si está visible
            const resumenContainer = document.getElementById('detalle-org-expediente-content');
            if (resumenContainer && !resumenContainer.innerHTML.includes('Activar Expediente')) {
                // No action needed really
            }

        } else {
            alert('Error al eliminar: ' + (response ? response.error : 'Desconocido'));
        }
    } catch (e) { console.error(e); alert('Error de conexión'); }
},
    
    async cerrarExpediente() {
    if (!this.currentExpedienteId) return;

    const motivo = prompt('Para cerrar el expediente, por favor indique una razón o conclusión final:');
    if (motivo === null) return; // Cancelado

    try {
        // 1. Actualizar estatus
        await window.AppUtils.fetchAPI(`/ expedientes / ${ this.currentExpedienteId } `, {
            method: 'PUT',
            body: JSON.stringify({ estatus: 'CERRADO' })
        });

        // 2. Agregar movimiento de cierre
        await window.AppUtils.fetchAPI(`/ expedientes / ${ this.currentExpedienteId }/avances`, {
method: 'POST',
    body: JSON.stringify({
        titulo: 'Expediente Cerrado',
        descripcion: motivo || 'Cierre formal del expediente.',
        tipo: 'OTRO',
        fecha: new Date().toISOString().split('T')[0]
    })
        });

// 3. Recargar
this.verDetalle(this.currentExpedienteId);

if (document.getElementById('expedientes-lista')) this.cargarExpedientes();

    } catch (error) {
    console.error(error);
    alert('Error al cerrar expediente');
}
},

    async reabrirExpediente() {
    if (!this.currentExpedienteId) return;

    const motivo = prompt('¿Por qué se reabre este expediente? (Este comentario quedará registrado):');
    if (!motivo) return;

    try {
        // 1. Actualizar estatus
        await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}`, {
            method: 'PUT',
            body: JSON.stringify({ estatus: 'ABIERTO' })
        });

        // 2. Agregar movimiento de reapertura
        await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}/avances`, {
            method: 'POST',
            body: JSON.stringify({
                titulo: 'Expediente Reabierto',
                descripcion: motivo,
                tipo: 'OTRO',
                fecha: new Date().toISOString().split('T')[0]
            })
        });

        // 3. Recargar
        this.verDetalle(this.currentExpedienteId);

        if (document.getElementById('expedientes-lista')) this.cargarExpedientes();

    } catch (error) {
        console.error(error);
        alert('Error al reabrir expediente');
    }
}
};

window.ExpedientesModule = ExpedientesModule;
window.cargarExpedientes = () => ExpedientesModule.cargarExpedientes();

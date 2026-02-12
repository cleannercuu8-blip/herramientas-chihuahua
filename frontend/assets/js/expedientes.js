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

                // VISTA RESUMIDA TIPO TARJETA
                container.innerHTML = `
                    <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <h4 style="margin: 0; font-size: 1rem; color: #1e293b;">Expediente de Seguimiento</h4>
                                <span class="badge badge-info">${expediente.estatus}</span>
                            </div>
                            <p style="margin: 5px 0 0; font-size: 0.85rem; color: #64748b;">
                                Folio: <strong>${expediente.numero_expediente}</strong>
                            </p>
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="ExpedientesModule.verDetalle(${expediente.id})">
                            📂 Abrir Expediente
                        </button>
                    </div>
                `;
            } else {
                // No existe, mostrar opción de configuración para activar
                container.innerHTML = `
                   <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4 style="margin: 0; font-size: 1rem; color: #1e293b;">Expediente de Seguimiento</h4>
                            <p style="margin: 5px 0 0; font-size: 0.85rem; color: #64748b;">
                                Esta dependencia no tiene un expediente activo.
                            </p>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="badge" style="background: #e2e8f0; color: #64748b;">Inactivo</span>
                            <button class="btn btn-sm btn-primary" onclick="ExpedientesModule.crearExpedienteRapido(${organizacionId}, '${containerId}')">
                                Activar Expediente
                            </button>
                        </div>
                   </div>
                `;
            }
        } catch (error) {
            console.error('Error al cargar expediente de organización:', error);
            container.innerHTML = '<p class="text-error">Error al cargar información del expediente.</p>';
        }
    },

    async crearExpedienteRapido(organizacionId, containerId) {
        if (!confirm('¿Desea abrir un nuevo expediente de seguimiento para esta dependencia?')) return;

        try {
            // 1. Obtener detalles de la organización para las siglas
            const orgData = await window.AppUtils.fetchAPI(`/organizaciones/${organizacionId}`);
            if (!orgData || !orgData.organizacion) throw new Error('No se pudo obtener datos de la organización');

            const siglas = orgData.organizacion.siglas || 'S-N';
            const anio = new Date().getFullYear();
            const folio = `EXP-DSIJ-${siglas}-${anio}`;

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
        }
    },

    async verDetalle(id) {
        this.currentExpedienteId = id;
        window.mostrarModal('modal-detalle-expediente');
        const timelineContainer = document.getElementById('expediente-timeline');
        timelineContainer.innerHTML = '<p class="text-center">Cargando...</p>';

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
            const dateInput = document.querySelector('#form-nuevo-avance input[name="fecha"]');
            if (dateInput) dateInput.valueAsDate = new Date();

            // Inject Close Button in Footer if Open
            const footer = document.querySelector('#modal-detalle-expediente .modal-footer');
            if (footer) {
                let closeBtn = '';
                if (expediente.estatus !== 'CERRADO') {
                    closeBtn = `<button class="btn btn-danger" onclick="window.ExpedientesModule.cerrarExpediente()" style="margin-right: auto;">🔒 Cerrar Expediente</button>`;
                }
                footer.innerHTML = `
                    ${closeBtn}
                    <button class="btn btn-secondary" onclick="window.ExpedientesModule.descargarPDF()">📄 Descargar Reporte PDF</button>
                    <button class="btn btn-primary" onclick="cerrarModal('modal-detalle-expediente')">Cerrar Ventana</button>
                `;
            }

        } catch (error) {
            console.error(error);
            alert('Error al cargar expediente');
        }
    },

    async cerrarExpediente() {
        if (!this.currentExpedienteId) return;
        if (!confirm('¿Está seguro de que desea CERRAR este expediente? Esto registrará un cierre formal en la bitácora.')) return;

        try {
            // 1. Actualizar estatus
            await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}`, {
                method: 'PUT',
                body: JSON.stringify({ estatus: 'CERRADO' })
            });

            // 2. Agregar movimiento de cierre
            await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}/avances`, {
                method: 'POST',
                body: JSON.stringify({
                    titulo: 'Expediente Cerrado',
                    descripcion: 'Se procedió al cierre formal del expediente de seguimiento.',
                    tipo: 'OTRO',
                    fecha: new Date().toISOString().split('T')[0]
                })
            });

            // 3. Recargar detalle y lista principal si hizo falta
            this.verDetalle(this.currentExpedienteId);

            // Refrescar lista de fondo si existe
            if (document.getElementById('expedientes-lista')) this.cargarExpedientes();

        } catch (error) {
            console.error(error);
            alert('Error al cerrar expediente');
        }
    }
};

window.ExpedientesModule = ExpedientesModule;
window.cargarExpedientes = () => ExpedientesModule.cargarExpedientes();

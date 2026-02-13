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

                container.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div>
                            <h5 style="margin: 0; color: var(--azul-institucional); font-size: 1rem;">${expediente.numero_expediente}</h5>
                            <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #64748b;">${expediente.titulo}</p>
                            <div style="margin-top: 5px;">
                                <span class="badge ${expediente.estatus === 'ABIERTO' ? 'badge-verde' : 'badge-rojo'}">${expediente.estatus}</span>
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="window.ExpedientesModule.verDetalle(${expediente.id})">
                            📂 Ver Bitácora
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="text-center p-20" style="background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
                        <p class="mb-10 text-muted">No hay expediente de seguimiento activo para esta dependencia.</p>
                        <button class="btn btn-secondary" onclick="window.ExpedientesModule.crearAutomatico(${organizacionId}, '${containerId}')">
                            ✨ Activar Expediente
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error:', error);
            container.innerHTML = '<p class="text-error">Error al cargar expediente.</p>';
        }
    },

    async crearAutomatico(organizacionId, containerId) {
        if (!confirm('¿Desea activar el expediente de seguimiento para esta dependencia?')) return;

        try {
            // Obtener datos de la organización para las siglas
            const orgData = await window.AppUtils.fetchAPI(`/organizaciones/${organizacionId}`);
            if (!orgData || !orgData.organizacion) {
                alert('Error al obtener datos de la organización');
                return;
            }

            const siglas = orgData.organizacion.siglas || 'SN';
            const anio = new Date().getFullYear();

            const datos = {
                organizacion_id: organizacionId,
                titulo: 'Expediente de Seguimiento General',
                numero_expediente: `DSIJ-${siglas}-${anio}`,
                prioridad: 'MEDIA',
                estatus: 'ABIERTO',
                descripcion: 'Expediente generado automáticamente para seguimiento.'
            };

            const response = await window.AppUtils.fetchAPI('/expedientes', {
                method: 'POST',
                body: JSON.stringify(datos)
            });

            if (response && !response.error) {
                this.renderizarEnDetalleOrganizacion(organizacionId, containerId);
                window.AppUtils.mostrarAlerta('Expediente activado correctamente', 'success');
            } else {
                alert('Error al crear: ' + (response.error || 'Desconocido'));
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        }
    },

    async verDetalle(id) {
        this.currentExpedienteId = id;

        const modal = document.getElementById('modal-detalle-expediente');
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) modalContent.style.maxWidth = '95%';

        window.mostrarModal('modal-detalle-expediente');
        const timelineContainer = document.getElementById('expediente-timeline');
        timelineContainer.innerHTML = '<p class="text-center">Cargando...</p>';

        try {
            const data = await window.AppUtils.fetchAPI(`/expedientes/${id}`);
            if (data.error) throw new Error(data.error);

            const { expediente, avances } = data;

            document.getElementById('detalle-exp-titulo').textContent = expediente.titulo;
            document.getElementById('detalle-exp-subtitulo').textContent = `${expediente.numero_expediente} | ${expediente.organizacion_nombre}`;

            this.renderTimeline(avances || []);
            this.renderInfoTab(expediente);

            const dateInput = document.querySelector('#form-nuevo-avance input[name="fecha"]');
            if (dateInput) dateInput.valueAsDate = new Date();

            const footer = document.querySelector('#modal-detalle-expediente .modal-footer');
            if (footer) {
                let actionBtn = '';
                if (expediente.estatus !== 'CERRADO') {
                    actionBtn = `<button class="btn btn-danger" onclick="window.ExpedientesModule.cerrarExpediente()" style="margin-right: auto;">🔒 Cerrar Expediente</button>`;
                } else {
                    actionBtn = `<button class="btn btn-warning" onclick="window.ExpedientesModule.reabrirExpediente()" style="margin-right: auto; background-color: #f59e0b; color: white;">↩️ Reabrir Expediente</button>`;
                }

                footer.innerHTML = `
                    ${actionBtn}
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
        if (!avances || avances.length === 0) {
            container.innerHTML = '<p class="text-center text-muted p-20">No hay avances registrados.</p>';
            return;
        }

        container.innerHTML = avances.map(av => `
            <div class="timeline-item">
                <div class="timeline-marker ${av.tipo.toLowerCase()}"></div>
                <div class="timeline-content" style="position: relative; padding-right: 50px;">
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
            </div>
        `).join('');
    },

    renderInfoTab(expediente) {
        const container = document.getElementById('expediente-info-content');
        if (!container) return;

        container.innerHTML = `
            <div class="card bg-light">
                <h4 style="color: var(--azul-institucional); margin-bottom: 15px;">📋 Información del Expediente</h4>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div>
                        <label style="font-weight: 600; color: #64748b; font-size: 0.85rem; display: block; margin-bottom: 5px;">Número de Expediente</label>
                        <p style="margin: 0; font-size: 1rem;">${expediente.numero_expediente}</p>
                    </div>
                    
                    <div>
                        <label style="font-weight: 600; color: #64748b; font-size: 0.85rem; display: block; margin-bottom: 5px;">Estado</label>
                        <p style="margin: 0;"><span class="badge ${expediente.estatus === 'ABIERTO' ? 'badge-verde' : 'badge-rojo'}">${expediente.estatus}</span></p>
                    </div>
                    
                    <div>
                        <label style="font-weight: 600; color: #64748b; font-size: 0.85rem; display: block; margin-bottom: 5px;">Dependencia/Entidad</label>
                        <p style="margin: 0; font-size: 1rem;">${expediente.organizacion_nombre}</p>
                    </div>
                    
                    <div>
                        <label style="font-weight: 600; color: #64748b; font-size: 0.85rem; display: block; margin-bottom: 5px;">Prioridad</label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <select id="expediente-prioridad-select" class="form-select" style="max-width: 150px;">
                                <option value="BAJA" ${expediente.prioridad === 'BAJA' ? 'selected' : ''}>Baja</option>
                                <option value="MEDIA" ${expediente.prioridad === 'MEDIA' ? 'selected' : ''}>Media</option>
                                <option value="ALTA" ${expediente.prioridad === 'ALTA' ? 'selected' : ''}>Alta</option>
                            </select>
                            <button class="btn btn-sm btn-primary" onclick="window.ExpedientesModule.actualizarPrioridad()" style="padding: 5px 15px;">
                                💾 Guardar
                            </button>
                        </div>
                    </div>
                    
                    <div style="grid-column: 1 / -1;">
                        <label style="font-weight: 600; color: #64748b; font-size: 0.85rem; display: block; margin-bottom: 5px;">Descripción</label>
                        <p style="margin: 0; font-size: 0.95rem; line-height: 1.5;">${expediente.descripcion || 'Sin descripción'}</p>
                    </div>
                    
                    <div>
                        <label style="font-weight: 600; color: #64748b; font-size: 0.85rem; display: block; margin-bottom: 5px;">Fecha de Creación</label>
                        <p style="margin: 0;">${new Date(expediente.fecha_creacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    
                    <div>
                        <label style="font-weight: 600; color: #64748b; font-size: 0.85rem; display: block; margin-bottom: 5px;">Última Actualización</label>
                        <p style="margin: 0;">${new Date(expediente.ultima_actualizacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>
        `;
    },

    async handleAgregarAvance(event) {
        event.preventDefault();
        const form = event.target;
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
                this.verDetalle(this.currentExpedienteId);
                window.AppUtils.mostrarAlerta('Avance registrado', 'success');
            } else {
                alert('Error: ' + response.error);
            }
        } catch (error) {
            console.error(error);
            alert('Error al registrar avance');
        }
    },

    async eliminarAvance(avanceId) {
        if (!confirm('¿Seguro que desea eliminar este registro?')) return;

        try {
            const response = await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}/avances/${avanceId}`, {
                method: 'DELETE'
            });

            if (response && !response.error) {
                this.verDetalle(this.currentExpedienteId);
            } else {
                alert('Error al eliminar: ' + (response ? response.error : 'Desconocido'));
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        }
    },

    async cerrarExpediente() {
        if (!this.currentExpedienteId) return;

        const motivo = prompt('Para cerrar el expediente, por favor indique una razón o conclusión final:');
        if (motivo === null) return;

        try {
            await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}`, {
                method: 'PUT',
                body: JSON.stringify({ estatus: 'CERRADO' })
            });

            await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}/avances`, {
                method: 'POST',
                body: JSON.stringify({
                    titulo: 'Expediente Cerrado',
                    descripcion: motivo || 'Cierre formal del expediente.',
                    tipo: 'OTRO',
                    fecha: new Date().toISOString().split('T')[0]
                })
            });

            this.verDetalle(this.currentExpedienteId);
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
            await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}`, {
                method: 'PUT',
                body: JSON.stringify({ estatus: 'ABIERTO' })
            });

            await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}/avances`, {
                method: 'POST',
                body: JSON.stringify({
                    titulo: 'Expediente Reabierto',
                    descripcion: motivo,
                    tipo: 'OTRO',
                    fecha: new Date().toISOString().split('T')[0]
                })
            });

            this.verDetalle(this.currentExpedienteId);
        } catch (error) {
            console.error(error);
            alert('Error al reabrir expediente');
        }
    },

    async actualizarPrioridad() {
        if (!this.currentExpedienteId) return;

        const select = document.getElementById('expediente-prioridad-select');
        if (!select) return;

        const nuevaPrioridad = select.value;

        try {
            await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}`, {
                method: 'PUT',
                body: JSON.stringify({ prioridad: nuevaPrioridad })
            });

            window.AppUtils.mostrarAlerta('Prioridad actualizada correctamente', 'success');

            // Recargar detalles para reflejar el cambio
            this.verDetalle(this.currentExpedienteId);
        } catch (error) {
            console.error(error);
            alert('Error al actualizar prioridad');
        }
    },

    async descargarPDF() {
        if (!this.currentExpedienteId) return;
        window.open(`${window.AppUtils.API_URL}/expedientes/${this.currentExpedienteId}/pdf`);
    },

    async mostrarReportePrioridades() {
        try {
            const data = await window.AppUtils.fetchAPI('/expedientes');
            const expedientes = data.expedientes || [];

            // Agrupar por prioridad
            const porPrioridad = {
                ALTA: expedientes.filter(e => e.prioridad === 'ALTA'),
                MEDIA: expedientes.filter(e => e.prioridad === 'MEDIA'),
                BAJA: expedientes.filter(e => e.prioridad === 'BAJA')
            };

            const container = document.getElementById('reporte-prioridades-content');

            container.innerHTML = `
                <div style="display: grid; gap: 20px;">
                    <!-- Alta Prioridad -->
                    <div class="card" style="border-left: 4px solid #EF4444;">
                        <h4 style="color: #EF4444; margin-bottom: 15px;">🔴 Alta Prioridad (${porPrioridad.ALTA.length})</h4>
                        ${porPrioridad.ALTA.length > 0 ? `
                            <div style="display: grid; gap: 10px;">
                                ${porPrioridad.ALTA.map(exp => `
                                    <div style="padding: 10px; background: #FEE2E2; border-radius: 6px; cursor: pointer;" 
                                         onclick="window.ExpedientesModule.verDetalle(${exp.id})">
                                        <div style="font-weight: 600;">${exp.numero_expediente}</div>
                                        <div style="font-size: 0.9rem; color: #64748b;">${exp.organizacion_nombre || 'Sin organización'}</div>
                                        <div style="font-size: 0.85rem; margin-top: 5px;">${exp.descripcion || 'Sin descripción'}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted">No hay expedientes con alta prioridad</p>'}
                    </div>

                    <!-- Media Prioridad -->
                    <div class="card" style="border-left: 4px solid #F59E0B;">
                        <h4 style="color: #F59E0B; margin-bottom: 15px;">🟡 Media Prioridad (${porPrioridad.MEDIA.length})</h4>
                        ${porPrioridad.MEDIA.length > 0 ? `
                            <div style="display: grid; gap: 10px;">
                                ${porPrioridad.MEDIA.map(exp => `
                                    <div style="padding: 10px; background: #FEF3C7; border-radius: 6px; cursor: pointer;" 
                                         onclick="window.ExpedientesModule.verDetalle(${exp.id})">
                                        <div style="font-weight: 600;">${exp.numero_expediente}</div>
                                        <div style="font-size: 0.9rem; color: #64748b;">${exp.organizacion_nombre || 'Sin organización'}</div>
                                        <div style="font-size: 0.85rem; margin-top: 5px;">${exp.descripcion || 'Sin descripción'}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted">No hay expedientes con media prioridad</p>'}
                    </div>

                    <!-- Baja Prioridad -->
                    <div class="card" style="border-left: 4px solid #10B981;">
                        <h4 style="color: #10B981; margin-bottom: 15px;">🟢 Baja Prioridad (${porPrioridad.BAJA.length})</h4>
                        ${porPrioridad.BAJA.length > 0 ? `
                            <div style="display: grid; gap: 10px;">
                                ${porPrioridad.BAJA.map(exp => `
                                    <div style="padding: 10px; background: #D1FAE5; border-radius: 6px; cursor: pointer;" 
                                         onclick="window.ExpedientesModule.verDetalle(${exp.id})">
                                        <div style="font-weight: 600;">${exp.numero_expediente}</div>
                                        <div style="font-size: 0.9rem; color: #64748b;">${exp.organizacion_nombre || 'Sin organización'}</div>
                                        <div style="font-size: 0.85rem; margin-top: 5px;">${exp.descripcion || 'Sin descripción'}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted">No hay expedientes con baja prioridad</p>'}
                    </div>
                </div>
            `;

            window.mostrarModal('modal-reporte-prioridades');
        } catch (error) {
            console.error(error);
            alert('Error al cargar reporte de prioridades');
        }
    }
};

window.ExpedientesModule = ExpedientesModule;
window.cargarExpedientes = () => ExpedientesModule.cargarExpedientes();

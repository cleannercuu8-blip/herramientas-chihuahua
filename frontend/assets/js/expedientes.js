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

        // Mostrar/ocultar botón de nuevo expediente según rol
        const usuario = window.AuthModule.getUsuario();
        const isAdminOrCapturista = usuario && (usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'CAPTURISTA');
        const btnNuevo = document.getElementById('btn-nuevo-expediente');
        if (btnNuevo) {
            btnNuevo.style.display = isAdminOrCapturista ? 'block' : 'none';
        }

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

            // Ordenar por ID descendente (más recientes primero)
            expedientes.sort((a, b) => b.id - a.id);

            // Buscar expediente ACTIVO (ABIERTO)
            const expedienteActivo = expedientes.find(e => e.estatus === 'ABIERTO');
            // El resto son historial
            const historial = expedientes.filter(e => e.id !== (expedienteActivo ? expedienteActivo.id : -1));

            let html = '';

            // 1. Mostrar Expediente Activo (si existe)
            if (expedienteActivo) {
                this.currentExpedienteId = expedienteActivo.id;
                html += `
                    <div class="card mb-20" style="border-left: 5px solid var(--verde-cumplimiento); box-shadow: var(--sombra-md);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h5 style="margin: 0; color: var(--azul-institucional); font-size: 1.1rem; display: flex; align-items:center; gap: 8px;">
                                    <span style="font-size: 1.3rem;">📂</span> Expediente de Seguimiento Activo
                                </h5>
                                <p style="margin: 5px 0; font-weight: 700; font-size: 1.2rem;">${expedienteActivo.numero_expediente}</p>
                                <span class="badge badge-verde">EN PROCESO</span>
                                <small class="d-block text-muted mt-5">${expedienteActivo.titulo}</small>
                            </div>
                            <button class="btn btn-primary" onclick="window.ExpedientesModule.verDetalle(${expedienteActivo.id})">
                                Ver Bitácora y Avances ➔
                            </button>
                        </div>
                    </div>
                `;
            }

            // 2. Botón para Crear Nuevo - SOLO si no hay uno activo
            if (!expedienteActivo) {
                html += `
                    <div class="text-center p-15 mb-20" style="background: #f1f5f9; border-radius: 8px; border: 1px dashed #cbd5e1;">
                        <button class="btn btn-outline-primary" onclick="window.ExpedientesModule.crearAutomatico(${organizacionId}, '${containerId}')">
                             ➕ Iniciar Nuevo Expediente de Seguimiento
                        </button>
                    </div>
                `;
            }

            // 2. Mostrar Historial (si hay expedientes anteriores)
            if (historial.length > 0) {
                html += `
                    <div class="mt-20">
                        <h6 style="color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">
                            📜 Historial de Expedientes Cerrados
                        </h6>
                        <div class="list-group">
                            ${historial.map(exp => `
                                <div class="list-group-item" style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <span style="font-weight: 600; color: #475569;">${exp.numero_expediente}</span>
                                        <span class="badge ${exp.estatus === 'ABIERTO' ? 'badge-verde' : 'badge-rojo'}" style="font-size: 0.7rem; margin-left: 10px;">${exp.estatus}</span>
                                        <div style="font-size: 0.8rem; color: #94a3b8;">
                                            ${exp.fecha_creacion ? new Date(exp.fecha_creacion).toLocaleDateString() : 'Fecha no registrada'} - ${exp.titulo}
                                        </div>
                                    </div>
                                    <button class="btn btn-outline-primary btn-sm" onclick="window.ExpedientesModule.verDetalle(${exp.id})" style="padding: 2px 10px; font-size: 0.8rem;">
                                        Consultar
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;

        } catch (error) {
            console.error('Error:', error);
            container.innerHTML = '<p class="text-error">Error al cargar expedientes.</p>';
        }
    },

    async crearAutomatico(organizacionId, containerId) {
        if (!confirm('¿Desea activar un NUEVO expediente para esta dependencia?')) return;

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
                titulo: `Expediente de Seguimiento ${anio}`,
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
                window.AppUtils.mostrarAlerta('Nuevo expediente activado exitosamente', 'success');
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

        // Guardar de dónde venimos para poder regresar
        this.vistaPrevia = window.AppState?.currentView || 'herramientas';

        // Cambiar a la vista de expediente (SPA)
        window.mostrarVista('expediente');

        // Limpiar contenido previo y mostrar spinner en áreas de contenido
        const timelineContainer = document.getElementById('expediente-timeline');
        const infoContainer = document.getElementById('expediente-info-content');

        if (timelineContainer) timelineContainer.innerHTML = '<div class="spinner"></div>';
        if (infoContainer) infoContainer.innerHTML = '<div class="spinner"></div>';

        // Resetear formulario de avance si existe
        const formContainer = document.getElementById('form-avance-container');
        if (formContainer) formContainer.style.display = 'none';

        // Remover botón de "Agregar Avance" previo si existe para evitar duplicados
        const prevBtn = document.getElementById('btn-mostrar-form-avance-wrapper');
        if (prevBtn) prevBtn.remove();

        try {
            const data = await window.AppUtils.fetchAPI(`/expedientes/${id}`);
            if (data.error) throw new Error(data.error);

            this.currentExpediente = data.expediente;
            this.avances = data.avances || [];

            // 1. Actualizar Header
            const tituloEl = document.getElementById('detalle-exp-titulo');
            const subEl = document.getElementById('detalle-exp-subtitulo');

            if (tituloEl) tituloEl.textContent = data.expediente.titulo;
            if (subEl) subEl.textContent = `${data.expediente.numero_expediente} | ${data.expediente.organizacion_nombre}`;

            // 2. Renderizar Contenido Tabs
            this.renderTimeline(this.avances);
            this.renderInfoTab(this.currentExpediente);

            // 3. Manejo del Formulario de Nuevo Avance (Toggle)
            const usuario = window.AuthModule.getUsuario();
            const isAdminOrCapturista = usuario && (usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'CAPTURISTA');

            if (isAdminOrCapturista && formContainer) {
                // Insertar botón para mostrar formulario antes del contenedor del formulario
                const btnWrapper = document.createElement('div');
                btnWrapper.id = 'btn-mostrar-form-avance-wrapper';
                btnWrapper.className = 'mb-20 text-right';
                btnWrapper.innerHTML = `
                    <button class="btn btn-primary btn-sm" onclick="document.getElementById('form-avance-container').style.display = 'block'; this.parentElement.style.display = 'none';">
                        ➕ Agregar Avance
                    </button>
                `;
                // Insertar antes del formContainer
                formContainer.parentNode.insertBefore(btnWrapper, formContainer);

                // Agregar botón cancelar dentro del formulario si no existe
                let formHeader = formContainer.querySelector('.form-header-actions');
                if (!formHeader) {
                    // Solo si no se ha inyectado antes
                    // Podríamos inyectar un botón de cancelar simple
                    const closeBtn = document.createElement('button');
                    closeBtn.type = 'button';
                    closeBtn.className = 'btn btn-sm btn-outline-secondary';
                    closeBtn.style.float = 'right';
                    closeBtn.innerHTML = '✖ Cancelar';
                    closeBtn.onclick = function () {
                        formContainer.style.display = 'none';
                        const wrapper = document.getElementById('btn-mostrar-form-avance-wrapper');
                        if (wrapper) wrapper.style.display = 'block';
                    };

                    // Insertar al principio del formulario o antes del primer input
                    const formNode = formContainer.querySelector('form');
                    if (formNode) formNode.insertBefore(closeBtn, formNode.firstChild);
                }
            }

            // 4. Actualizar Footer Actions (Ya no usamos el modal footer, usamos el del SPA view)
            const footer = document.getElementById('expediente-admin-actions');
            if (footer) {
                let actionBtn = '';
                if (isAdminOrCapturista) {
                    if (this.currentExpediente.estatus === 'ABIERTO') {
                        actionBtn = `<button class="btn btn-danger" onclick="window.ExpedientesModule.cambiarEstatus('CERRADO')">🔒 Cerrar Expediente</button>`;
                    } else {
                        actionBtn = `<button class="btn btn-warning" onclick="window.ExpedientesModule.cambiarEstatus('ABIERTO')">🔓 Reabrir Expediente</button>`;
                    }
                }

                footer.innerHTML = actionBtn;
            }

        } catch (error) {
            console.error(error);
            if (timelineContainer) timelineContainer.innerHTML = '<p class="text-error text-center">Error al cargar datos.</p>';
        }
    },

    renderTimeline(avances) {
        const container = document.getElementById('expediente-timeline');
        if (!avances || avances.length === 0) {
            container.innerHTML = '<p class="text-center text-muted p-20">No hay avances registrados.</p>';
            return;
        }

        const usuario = window.AuthModule.getUsuario();
        const isAdminOrCapturista = usuario && (usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'CAPTURISTA');

        // Ordenar por fecha descendente (más reciente primero)
        avances.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        container.innerHTML = avances.map(av => {
            // Iconos según tipo
            let icon = '📌'; // Default
            if (av.tipo === 'AVANCE') icon = '📈';
            if (av.tipo === 'REUNION') icon = '👥';
            if (av.tipo === 'OFICIO') icon = '📄';

            // Formato de fecha
            const fechaObj = new Date(av.fecha);
            const dia = fechaObj.getDate();
            const mes = fechaObj.toLocaleString('es-MX', { month: 'short' }).toUpperCase();
            const anio = fechaObj.getFullYear();

            return `
            <div class="timeline-item" style="display: flex; gap: 20px; margin-bottom: 25px; position: relative;">
                <!-- Línea conectora -->
                <div style="position: absolute; left: 24px; top: 50px; bottom: -30px; width: 2px; background: #e2e8f0; z-index: 0;"></div>
                
                <!-- Columna Fecha/Icono -->
                <div style="display: flex; flex-direction: column; align-items: center; min-width: 50px; z-index: 1;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: white; border: 2px solid var(--azul-institucional); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        ${icon}
                    </div>
                    <div style="margin-top: 5px; text-align: center; line-height: 1;">
                        <span style="font-weight: 800; font-size: 1.2rem; color: #334155; display: block;">${dia}</span>
                        <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">${mes}</span>
                        <span style="font-size: 0.7rem; color: #94a3b8; display: block;">${anio}</span>
                    </div>
                </div>

                <!-- Tarjeta Contenido -->
                <div class="timeline-content card" style="flex: 1; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border-radius: 12px; transition: transform 0.2s; position: relative; overflow: hidden;">
                    <!-- Barra lateral de color según tipo -->
                    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px;" class="bg-${av.tipo.toLowerCase()}"></div>
                    
                    <div style="padding: 15px 20px;">
                        ${isAdminOrCapturista ? `
                        <button class="btn btn-sm btn-action" 
                                style="position: absolute; top: 15px; right: 15px; background: #f1f5f9; border: none; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #ef4444; transition: background 0.2s;" 
                                onclick="ExpedientesModule.eliminarAvance(${av.id})" 
                                title="Eliminar registro">
                            🗑️
                        </button>` : ''}
                        
                        <div style="margin-bottom: 8px;">
                            <span class="badge badge-${av.tipo.toLowerCase()}" style="font-size: 0.7rem; letter-spacing: 0.5px;">${av.tipo}</span>
                        </div>
                        
                        <h5 style="margin: 0 0 10px 0; color: var(--azul-institucional); font-size: 1.1rem; padding-right: 30px;">${av.titulo}</h5>
                        
                        ${av.descripcion ? `
                        <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin-bottom: 15px; background: #f8fafc; padding: 10px; border-radius: 6px;">
                            ${av.descripcion}
                        </p>` : ''}
                        
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                            <span>👤 Registrado por:</span>
                            <strong style="color: #64748b;">${av.usuario_nombre || 'Sistema'}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    },

    renderInfoTab(expediente) {
        const container = document.getElementById('expediente-info-content');
        if (!container) return;

        const usuario = window.AuthModule.getUsuario();
        const isAdminOrCapturista = usuario && (usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'CAPTURISTA');

        container.innerHTML = `
            <div class="card bg-light" style="border-left: 5px solid var(--azul-institucional); background: #fdfdfd;">
                <h4 style="color: var(--azul-institucional); margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    📋 Información General del Expediente
                </h4>
                
                <div class="row">
                    <div class="col">
                        <div class="form-group">
                            <label class="form-label text-muted" style="font-size: 0.85rem;">Número de Expediente</label>
                            <div style="font-weight: 600; font-size: 1.1rem;">${expediente.numero_expediente}</div>
                        </div>
                    </div>
                    <div class="col">
                        <div class="form-group">
                            <label class="form-label text-muted" style="font-size: 0.85rem;">Estado</label>
                            <div><span class="badge ${expediente.estatus === 'ABIERTO' ? 'badge-verde' : 'badge-rojo'}">${expediente.estatus}</span></div>
                        </div>
                    </div>
                </div>

                <div class="row mt-10">
                    <div class="col">
                        <div class="form-group">
                            <label class="form-label text-muted" style="font-size: 0.85rem;">Dependencia/Entidad</label>
                            <div style="font-weight: 500;">${expediente.organizacion_nombre}</div>
                        </div>
                    </div>
                    <div class="col">
                        <div class="form-group">
                            <label class="form-label text-muted" style="font-size: 0.85rem;">Prioridad</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <select class="form-select" id="select-prioridad-expediente" style="width: auto;" ${!isAdminOrCapturista ? 'disabled' : ''}>
                                    <option value="BAJA" ${expediente.prioridad === 'BAJA' ? 'selected' : ''}>Baja</option>
                                    <option value="MEDIA" ${expediente.prioridad === 'MEDIA' ? 'selected' : ''}>Media</option>
                                    <option value="ALTA" ${expediente.prioridad === 'ALTA' ? 'selected' : ''}>Alta</option>
                                    <option value="URGENTE" ${expediente.prioridad === 'URGENTE' ? 'selected' : ''}>Urgente</option>
                                </select>
                                ${isAdminOrCapturista ? `
                                <button class="btn btn-outline-primary" onclick="window.ExpedientesModule.guardarPrioridad()" style="padding: 4px 10px; font-size: 0.75rem;">
                                    💾 Guardar
                                </button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-20">
                    <div class="form-group">
                        <label class="form-label text-muted" style="font-size: 0.85rem;">Descripción</label>
                        <p style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #eee;">
                            ${expediente.descripcion || 'Sin descripción'}
                        </p>
                    </div>
                </div>

                <div class="row mt-20" style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 15px;">
                    <div class="col">
                        <small class="text-muted">Fecha de Creación</small>
                        <div>${expediente.fecha_creacion ? new Date(expediente.fecha_creacion).toLocaleDateString() : 'No registrada'}</div>
                    </div>
                    <div class="col">
                        <small class="text-muted">Última Actualización</small>
                        <div>${expediente.ultima_actualizacion ? new Date(expediente.ultima_actualizacion).toLocaleDateString() : 'No registrada'}</div>
                    </div>
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
                // Ocultar formulario
                const fc = document.getElementById('form-avance-container');
                if (fc) fc.style.display = 'none';
                const wrp = document.getElementById('btn-mostrar-form-avance-wrapper');
                if (wrp) wrp.style.display = 'block';

                this.verDetalle(this.currentExpedienteId);
                window.AppUtils.mostrarAlerta('Avance registrado correctamente', 'success');
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

    async cambiarEstatus(nuevoEstatus) {
        if (!this.currentExpedienteId) return;

        const isClosing = nuevoEstatus === 'CERRADO';
        const promptMsg = isClosing
            ? 'Para cerrar el expediente, por favor indique una razón o conclusión final:'
            : '¿Por qué se reabre este expediente? (Este comentario quedará registrado):';

        const motivo = prompt(promptMsg);
        if (motivo === null || (isClosing && !motivo)) {
            if (isClosing && motivo === "") alert("Debe indicar un motivo para cerrar el expediente.");
            return;
        }

        try {
            window.AppUtils.mostrarSpinner(true);

            // 1. Actualizar estatus del expediente
            await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}`, {
                method: 'PUT',
                body: JSON.stringify({ estatus: nuevoEstatus })
            });

            // 2. Registrar el movimiento en la bitácora
            await window.AppUtils.fetchAPI(`/expedientes/${this.currentExpedienteId}/avances`, {
                method: 'POST',
                body: JSON.stringify({
                    titulo: isClosing ? '🔒 Expediente Cerrado' : '🔓 Expediente Reabierto',
                    descripcion: motivo,
                    tipo: 'OTRO',
                    fecha: new Date().toISOString().split('T')[0]
                })
            });

            // 3. Recargar vista
            this.verDetalle(this.currentExpedienteId);
            window.AppUtils.mostrarAlerta(`Expediente ${isClosing ? 'cerrado' : 'reabierto'} con éxito`, 'success');

        } catch (error) {
            console.error(error);
            alert('Error al actualizar el estatus');
        } finally {
            window.AppUtils.mostrarSpinner(false);
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

    async mostrarReportePrioridades() {
        try {
            const data = await window.AppUtils.fetchAPI('/expedientes');
            const expedientes = data.expedientes || [];

            // Filtrar para mostrar solo el ÚLTIMO expediente por dependencia
            const ultimosExpedientes = [];
            const idsVistos = new Set();

            // Los expedientes suelen venir ordenados por ID desc o podemos asegurar orden
            expedientes.sort((a, b) => b.id - a.id).forEach(exp => {
                if (!idsVistos.has(exp.organizacion_id)) {
                    ultimosExpedientes.push(exp);
                    idsVistos.add(exp.organizacion_id);
                }
            });

            // Agrupar por prioridad usando solo los últimos registros
            const porPrioridad = {
                ALTA: ultimosExpedientes.filter(e => e.prioridad === 'ALTA'),
                MEDIA: ultimosExpedientes.filter(e => e.prioridad === 'MEDIA'),
                BAJA: ultimosExpedientes.filter(e => e.prioridad === 'BAJA')
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
                                         onclick="window.ExpedientesModule.navegarAExpedienteDesdeReporte(${exp.id}, ${exp.organizacion_id})">
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
                                         onclick="window.ExpedientesModule.navegarAExpedienteDesdeReporte(${exp.id}, ${exp.organizacion_id})">
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
                                         onclick="window.ExpedientesModule.navegarAExpedienteDesdeReporte(${exp.id}, ${exp.organizacion_id})">
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
    },

    async navegarAExpedienteDesdeReporte(expId, orgId) {
        // 1. Cerrar el reporte de prioridades
        cerrarModal('modal-reporte-prioridades');

        // 2. Abrir directamente el modal de detalle del expediente con su bitácora
        await this.verDetalle(expId);
    },

    switchTab(event, tabId) {
        // 1. Ocultar todos los contenidos de tabs
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => content.classList.remove('active'));

        // 2. Desactivar todos los links
        const links = document.querySelectorAll('.tab-link');
        links.forEach(link => link.classList.remove('active'));

        // 3. Mostrar el contenido seleccionado
        const selectedContent = document.getElementById(tabId);
        if (selectedContent) selectedContent.classList.add('active');

        // 4. Activar el link clickeado
        // Si se pasa el evento, usar currentTarget, si no, buscar por texto u otro medio si fuera necesario
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }
    },

    toggleInfoPanel() {
        const tabBitacora = document.getElementById('tab-bitacora');

        // Si bitacora está activa, cambiar a info
        if (tabBitacora && tabBitacora.classList.contains('active')) {
            this.switchTab(null, 'tab-info');
        } else {
            // Si no, volver a bitacora
            this.switchTab(null, 'tab-bitacora');
        }
    },

    regresarAVistaAnterior() {
        // Regresar a la vista donde el usuario estaba antes (Dashboard o Herramientas)
        const vista = this.vistaPrevia || 'herramientas';
        window.mostrarVista(vista);
    }
};

window.ExpedientesModule = ExpedientesModule;
window.cargarExpedientes = () => ExpedientesModule.cargarExpedientes();

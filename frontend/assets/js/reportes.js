// Módulo de reportes
const ReportesModule = {
    // Exportar inventario completo
    exportarInventario() {
        const token = window.AppUtils.AppState.token || localStorage.getItem('token');
        window.open(`${window.AppUtils.API_URL}/reportes/inventario?token=${token}`, '_blank');
    },

    // Exportar reporte de semáforo
    exportarSemaforo() {
        const token = window.AppUtils.AppState.token || localStorage.getItem('token');
        window.open(`${window.AppUtils.API_URL}/reportes/semaforo?token=${token}`, '_blank');
    },

    // Exportar herramientas próximas a vencer
    exportarProximasVencer(meses = 12) {
        const token = window.AppUtils.AppState.token || localStorage.getItem('token');
        window.open(`${window.AppUtils.API_URL}/reportes/proximas-vencer?meses=${meses}&token=${token}`, '_blank');
    },

    // Obtener historial
    async obtenerHistorial(limite = 100) {
        try {
            const data = await window.AppUtils.fetchAPI(`/reportes/historial?limite=${limite}`);
            return { success: true, data: data.historial };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // --- NUEVAS UTILIDADES ---

    // Mostrar Reporte de Cumplimiento
    async verReporteCumplimiento() {
        const dynamicContent = document.getElementById('utility-dynamic-content');
        const renderArea = document.getElementById('utility-render-area');

        dynamicContent.classList.remove('hidden');
        renderArea.innerHTML = '<div class="spinner"></div>';

        try {
            const resultado = await window.AppUtils.fetchAPI('/organizaciones?includeTools=true');

            if (!resultado.success) {
                renderArea.innerHTML = `<p style="color: red;">Error al obtener organizaciones: ${resultado.error}</p>`;
                return;
            }

            const orgs = resultado.data || [];

            let html = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 style="color: var(--sfp-azul); margin: 0;">📊 Reporte de Cumplimiento (Faltantes)</h4>
                    <button class="btn btn-secondary" onclick="document.getElementById('utility-dynamic-content').classList.add('hidden')">Cerrar</button>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Siglas</th>
                                <th>Dependencia</th>
                                <th style="text-align: center;">Reglamento</th>
                                <th style="text-align: center;">Manual de Org.</th>
                                <th style="text-align: center;">Manual de Proc.</th>
                                <th style="text-align: center;">Manual de Serv.</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            orgs.forEach(org => {
                // Simplificamos lógica: si no tiene herramientas de ese tipo, marcar como faltante
                // Nota: Esta lógica asume que las herramientas están vinculadas a la organización
                const h = org.herramientas || [];
                const tieneReg = h.some(i => i.tipo_herramienta === 'REGLAMENTO_INTERIOR' || i.tipo_herramienta === 'REGLAMENTO_ESTATUTO' || i.tipo_herramienta === 'ESTATUTO_ORGANICO');
                const tieneOrg = h.some(i => i.tipo_herramienta === 'MANUAL_ORGANIZACION');
                const tieneProc = h.some(i => i.tipo_herramienta === 'MANUAL_PROCEDIMIENTOS');
                const tieneServ = h.some(i => i.tipo_herramienta === 'MANUAL_SERVICIOS');

                html += `
                    <tr>
                        <td style="font-weight: bold; color: var(--sfp-morado);">${org.siglas || 'N/A'}</td>
                        <td style="font-size: 0.85rem;">${org.nombre}</td>
                        <td style="text-align: center;">${tieneReg ? '✅' : '❌'}</td>
                        <td style="text-align: center;">${tieneOrg ? '✅' : '❌'}</td>
                        <td style="text-align: center;">${tieneProc ? '✅' : '❌'}</td>
                        <td style="text-align: center;">${tieneServ ? '✅' : '❌'}</td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            renderArea.innerHTML = html;
        } catch (error) {
            renderArea.innerHTML = `<p style="color: red;">Error al cargar reporte: ${error.message}</p>`;
        }
    },

    // Mostrar Directorio Institucional
    async verDirectorioInstitucional() {
        const dynamicContent = document.getElementById('utility-dynamic-content');
        const renderArea = document.getElementById('utility-render-area');

        dynamicContent.classList.remove('hidden');
        renderArea.innerHTML = '<div class="spinner"></div>';

        try {
            const resultado = await window.OrganizacionesModule.obtenerTodas();

            if (!resultado.success) {
                renderArea.innerHTML = `<p style="color: red;">Error al obtener organizaciones: ${resultado.error}</p>`;
                return;
            }

            const orgs = resultado.data || [];

            let html = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 style="color: var(--sfp-morado); margin: 0;">📂 Directorio de Titulares y Siglas</h4>
                    <button class="btn btn-secondary" onclick="document.getElementById('utility-dynamic-content').classList.add('hidden')">Cerrar</button>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Siglas</th>
                                <th>Grado/Titular</th>
                                <th>Dependencia</th>
                                <th>Sector</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            orgs.forEach(org => {
                html += `
                    <tr>
                        <td style="font-weight: bold; color: var(--sfp-azul);">${org.siglas || '---'}</td>
                        <td>${org.titular || 'No asignado'}</td>
                        <td style="font-size: 0.85rem;">${org.nombre}</td>
                        <td style="font-size: 0.75rem;"><span class="badge badge-info">${org.tipo.replace(/_/g, ' ')}</span></td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            renderArea.innerHTML = html;
        } catch (error) {
            renderArea.innerHTML = `<p style="color: red;">Error al cargar directorio: ${error.message}</p>`;
        }
    },

    // Abrir Buscador Global de Archivos
    abrirBuscadorGlobal() {
        const dynamicContent = document.getElementById('utility-dynamic-content');
        const renderArea = document.getElementById('utility-render-area');

        dynamicContent.classList.remove('hidden');
        renderArea.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h4 style="color: #334155; margin: 0;">🔍 Buscador Global de Archivos</h4>
                <button class="btn btn-secondary" onclick="document.getElementById('utility-dynamic-content').classList.add('hidden')">Cerrar</button>
            </div>
            <div class="p-20" style="background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
                <div class="form-group">
                    <label>Nombre de la herramienta o palabra clave:</label>
                    <input type="text" id="global-search-input" class="form-input" placeholder="Ej: Reglamento, Manual de Org..." 
                           onkeyup="if(event.key === 'Enter') window.ReportesModule.ejecutarBusquedaGlobal()">
                </div>
                <button class="btn btn-primary w-full mt-10" onclick="window.ReportesModule.ejecutarBusquedaGlobal()">Buscar Archivo</button>
            </div>
            <div id="results-global-search" class="mt-20"></div>
        `;
    },

    async ejecutarBusquedaGlobal() {
        const query = document.getElementById('global-search-input').value;
        const resultsArea = document.getElementById('results-global-search');

        if (!query) return;
        resultsArea.innerHTML = '<div class="spinner"></div>';

        try {
            // Corregido: Usar la ruta inteligente y la nueva estructura .data
            const res = await window.AppUtils.fetchAPI(`/search/smart?q=${encodeURIComponent(query)}`);
            const herramientas = (res.data || []).filter(r => r.type === 'HERRAMIENTA');

            if (herramientas.length === 0) {
                resultsArea.innerHTML = '<p class="p-20 text-center color-gray">No se encontraron archivos con ese nombre.</p>';
                return;
            }

            let html = '<div class="table-container mt-10"><table class="table"><tbody>';
            herramientas.forEach(h => {
                html += `
                    <tr>
                        <td>
                            <div style="font-weight: bold; color: var(--sfp-azul);">${h.title}</div>
                            <div style="font-size: 0.75rem; color: #64748b;">Dependencia: ${h.subtitle}</div>
                        </td>
                        <td style="text-align: right;">
                            <button onclick="window.HerramientasModule.verDetalles(${h.id})" class="btn btn-secondary btn-sm">Ir a Herramienta</button>
                        </td>
                    </tr>
                `;
            });
            html += '</tbody></table></div>';
            resultsArea.innerHTML = html;
        } catch (error) {
            console.error(error);
            resultsArea.innerHTML = '<p class="text-danger">Error al conectar con el buscador.</p>';
        }
    },

    // --- CENTRO DE ENCOMIENDAS (GESTIÓN DE TAREAS) ---

    async abrirGestionTareas() {
        const modal = document.getElementById('modal-gestion-tareas');
        const lista = document.getElementById('contenedor-lista-tareas');
        const placeholder = document.getElementById('placeholder-tareas');
        const adminControls = document.getElementById('admin-task-controls');

        modal.classList.remove('hidden');
        lista.innerHTML = '';
        placeholder.classList.remove('hidden');

        // Mostrar controles si es ADMIN
        if (window.AppUtils.AppState.usuario.rol === 'ADMINISTRADOR') {
            adminControls.classList.remove('hidden');
        } else {
            adminControls.classList.add('hidden');
        }

        try {
            const endpoint = window.AppUtils.AppState.usuario.rol === 'ADMINISTRADOR' ? '/tareas/todas' : '/tareas/mis-tareas';
            const res = await window.AppUtils.fetchAPI(endpoint);

            placeholder.classList.add('hidden');

            if (!res.data || res.data.length === 0) {
                lista.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">No tienes tareas pendientes por ahora. ☕</div>';
                return;
            }

            res.data.forEach(t => {
                const card = document.createElement('div');
                card.className = `task-card priority-${t.prioridad.toLowerCase()}`;
                card.style = `
                    background: white; border-left: 5px solid ${this.getColorPrioridad(t.prioridad)}; 
                    padding: 15px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    display: flex; flex-direction: column; gap: 8px;
                `;

                const badgeEstatus = t.estatus === 'FINALIZADA' ? '✅' : t.estatus === 'EN_PROCESO' ? '⏳' : '📥';

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <span style="font-size: 0.7rem; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: #f1f5f9;">${t.prioridad}</span>
                        <span>${badgeEstatus}</span>
                    </div>
                    <h4 style="margin: 0; color: #1e293b;">${t.titulo}</h4>
                    <p style="font-size: 0.85rem; color: #64748b; margin: 0;">${t.descripcion || 'Sin descripción'}</p>
                    <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 5px;">
                        Asignada por: ${t.creado_por_nombre}<br>
                        Límite: ${t.fecha_limite ? new Date(t.fecha_limite).toLocaleDateString() : 'Sin fecha'}
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 5px;">
                        ${t.estatus !== 'FINALIZADA' ? `
                            <button onclick="window.ReportesModule.cambiarEstatusTarea(${t.id}, 'EN_PROCESO')" class="btn btn-sm" style="background: #f8fafc; flex: 1; font-size: 0.7rem;">En Proceso</button>
                            <button onclick="window.ReportesModule.cambiarEstatusTarea(${t.id}, 'FINALIZADA')" class="btn btn-sm btn-primary" style="flex: 1; font-size: 0.7rem;">Finalizar</button>
                        ` : '<span style="color: #10b981; font-weight: bold; font-size: 0.8rem; text-align: center; width: 100%;">Tarea Completada</span>'}
                    </div>
                `;
                lista.appendChild(card);
            });
        } catch (error) {
            placeholder.innerHTML = '<p class="text-danger">Error al cargar tareas.</p>';
        }
    },

    getColorPrioridad(p) {
        if (p === 'ALTA') return '#ef4444';
        if (p === 'MEDIA') return '#f59e0b';
        return '#3b82f6';
    },

    async mostrarFormNuevaTarea() {
        const modal = document.getElementById('modal-nueva-tarea');
        const select = document.getElementById('tarea-asignado');
        modal.classList.remove('hidden');

        // Cargar usuarios para el select (Simplificado: cargar desde el endpoint de usuarios existente)
        try {
            const res = await window.AppUtils.fetchAPI('/admin/usuarios');
            const usuarios = res.data || res.usuarios || []; // Retrocompatible durante transición
            select.innerHTML = usuarios.map(u => `<option value="${u.id}">${u.nombre_completo} (${u.rol})</option>`).join('');
        } catch (e) {
            select.innerHTML = '<option value="">Error al cargar usuarios</option>';
        }
    },

    async guardarTarea(e) {
        e.preventDefault();
        const datos = {
            titulo: document.getElementById('tarea-titulo').value,
            descripcion: document.getElementById('tarea-descripcion').value,
            asignado_a_id: document.getElementById('tarea-asignado').value,
            prioridad: document.getElementById('tarea-prioridad').value,
            fecha_limite: document.getElementById('tarea-fecha-limite').value
        };

        try {
            const res = await window.AppUtils.fetchAPI('/tareas', {
                method: 'POST',
                body: JSON.stringify(datos)
            });

            if (res.success) {
                window.AppUtils.mostrarAlerta('Tarea asignada correctamente');
                document.getElementById('modal-nueva-tarea').classList.add('hidden');
                this.abrirGestionTareas(); // Recargar lista
            }
        } catch (error) {
            window.AppUtils.mostrarAlerta('Error al crear tarea', 'error');
        }
    },

    async cambiarEstatusTarea(id, nuevoEstatus) {
        try {
            const res = await window.AppUtils.fetchAPI(`/tareas/${id}/estatus`, {
                method: 'PATCH',
                body: JSON.stringify({ estatus: nuevoEstatus })
            });

            if (res.success) {
                this.abrirGestionTareas();
            }
        } catch (error) {
            window.AppUtils.mostrarAlerta('Error al actualizar tarea', 'error');
        }
    }
};

window.ReportesModule = ReportesModule;

// Módulo de reportes
const ReportesModule = {
    // Exportar inventario completo
    exportarInventario() {
        const token = window.AppUtils.AppState.token || localStorage.getItem('token');
        window.open(url + `?token=${token}`, '_blank');
    },

    // Exportar reporte de semáforo
    exportarSemaforo() {
        const token = window.AppUtils.AppState.token || localStorage.getItem('token');
        window.open(url + `?token=${token}`, '_blank');
    },

    // Exportar herramientas próximas a vencer
    exportarProximasVencer(meses = 12) {
        const token = window.AppUtils.AppState.token || localStorage.getItem('token');
        window.open(url + `&token=${token}`, '_blank');
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
            const resultado = await window.OrganizacionesModule.obtenerTodas();

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
            // Reutilizamos el buscador global existente del backend si es posible
            const data = await window.AppUtils.fetchAPI(`/search?q=${encodeURIComponent(query)}`);

            if (!data.herramientas || data.herramientas.length === 0) {
                resultsArea.innerHTML = '<p class="p-20 text-center color-gray">No se encontraron archivos con ese nombre.</p>';
                return;
            }

            let html = '<div class="table-container mt-10"><table class="table"><tbody>';
            data.herramientas.forEach(h => {
                html += `
                    <tr>
                        <td>
                            <div style="font-weight: bold;">${h.nombre}</div>
                            <div style="font-size: 0.75rem; color: #64748b;">${h.organizacion_nombre}</div>
                        </td>
                        <td style="text-align: right;">
                            <a href="${h.url_archivo}" target="_blank" class="btn btn-secondary btn-sm">Ver Archivo</a>
                        </td>
                    </tr>
                `;
            });
            html += '</tbody></table></div>';
            resultsArea.innerHTML = html;
        } catch (error) {
            resultsArea.innerHTML = `<p style="color: red;">Error en búsqueda: ${error.message}</p>`;
        }
    }
};

window.ReportesModule = ReportesModule;

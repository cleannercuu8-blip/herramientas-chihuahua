// Aplicación principal
(function () {
  'use strict';

  // Verificar autenticación al cargar
  if (!window.AppUtils.verificarAutenticacion()) {
    return;
  }

  // Inicializar aplicación
  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.AppUtils.verificarAutenticacion()) return;

    // Notificar si el servidor tarda en responder (Render cold start)
    const healthCheckTimeout = setTimeout(() => {
      window.AppUtils.mostrarAlerta('El servidor está despertando, por favor espere...', 'info');
    }, 3000);

    try {
      // Ping de salud al servidor
      await fetch(`${window.AppUtils.API_URL}/health`).catch(() => { });
      clearTimeout(healthCheckTimeout);

      await initApp();
      setupEventListeners();
    } catch (error) {
      console.error('Error al inicializar la aplicación:', error);
    }
  });

  // Función para inicializar la aplicación
  async function initApp() {
    const usuario = window.AppUtils.AppState.usuario;

    // Poblar menú de usuario
    if (usuario) {
      const displayName = document.getElementById('user-display-name');
      const displayRole = document.getElementById('user-display-role');
      const avatarInitials = document.getElementById('user-avatar-initials');

      if (displayName) displayName.textContent = usuario.nombre_completo;
      if (displayRole) {
        const rolesMap = {
          'ADMINISTRADOR': 'Administrador',
          'CAPTURISTA': 'Capturista',
          'CONSULTOR': 'Consultor'
        };
        displayRole.textContent = rolesMap[usuario.rol] || usuario.rol;
      }

      // Iniciales para el avatar
      const iniciales = usuario.nombre_completo
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      if (avatarInitials) avatarInitials.textContent = iniciales || '?';

      // Mostrar pestaña de usuarios si es admin
      if (usuario.rol === 'ADMINISTRADOR') {
        const navBtnUsers = document.getElementById('nav-btn-usuarios');
        if (navBtnUsers) navBtnUsers.style.display = 'block';
      }
    }

    window.mostrarVista('dashboard');

    // Configurar visibilidad de mantenimiento para administradores
    const getUsuario = window.AuthModule.getUsuario || (() => window.AppUtils.AppState.usuario);
    const u = getUsuario();
    if (u && u.rol === 'ADMINISTRADOR') {
      const maintenanceSection = document.getElementById('admin-maintenance-section');
      if (maintenanceSection) maintenanceSection.style.display = 'block';
    }

    // Al cargar, inicializar estado de navegación
    AppState.currentView = 'dashboard';
  }

  // Función para configurar eventos (anteriormente dentro de DOMContentLoaded)
  function setupEventListeners() {
    configurarEventos();
  }

  // Cargar Reporte General
  async function cargarReporteGeneral() {
    await Promise.all([
      cargarEstadisticas(),
      cargarResumenSemaforo(),
      cargarProximasVencer()
    ]);
  }

  // Cargar estadísticas del dashboard
  async function cargarEstadisticas() {
    try {
      const resultado = await window.OrganizacionesModule.obtenerEstadisticas();
      const statsGrid = document.getElementById('stats-grid');

      if (resultado.success) {
        const stats = resultado.data;
        statsGrid.innerHTML = `
          <div class="stat-card">
            <div class="stat-number" style="color: var(--azul-institucional);">${stats.total || 0}</div>
            <div class="stat-label">Total Dependencias/Entidades</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: var(--verde-cumplimiento);">${stats.verde || 0}</div>
            <div class="stat-label">En Cumplimiento</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: var(--amarillo-advertencia);">${stats.amarillo || 0}</div>
            <div class="stat-label">Con Advertencias</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: var(--rojo-incumplimiento);">${stats.rojo || 0}</div>
            <div class="stat-label">Incumplimiento</div>
          </div>
        `;
      } else {
        throw new Error(resultado.error);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      document.getElementById('stats-grid').innerHTML = '<p class="text-error">Error al cargar estadísticas. Por favor, reintente.</p>';
    }
  }

  // Cargar resumen de semáforo (Dashboard Visual Redesign)
  async function cargarResumenSemaforo() {
    const listCentralizado = document.getElementById('list-centralizado');
    const listParaestatal = document.getElementById('list-paraestatal');
    const listAutonomo = document.getElementById('list-autonomo');
    const estadoGeneralDiv = document.getElementById('estado-general-bars');

    if (listCentralizado) listCentralizado.innerHTML = '<div class="spinner"></div>';
    if (listParaestatal) listParaestatal.innerHTML = '<div class="spinner"></div>';
    if (listAutonomo) listAutonomo.innerHTML = '<div class="spinner"></div>';
    if (estadoGeneralDiv) estadoGeneralDiv.innerHTML = '<div class="spinner"></div>';

    try {
      const resultado = await window.OrganizacionesModule.obtenerTodas();

      if (resultado.success) {
        const organizaciones = resultado.data;

        const centralizadas = organizaciones.filter(o => o.tipo === 'DEPENDENCIA');
        const paraestatales = organizaciones.filter(o => o.tipo === 'ENTIDAD_PARAESTATAL');
        const autonomos = organizaciones.filter(o => o.tipo === 'ORGANISMO_AUTONOMO');

        // Actualizar contadores de trapecios
        document.getElementById('count-centralizado').textContent = `${centralizadas.length} dependencias`;
        document.getElementById('count-paraestatal').textContent = `${paraestatales.length} entidades`;
        document.getElementById('count-autonomo').textContent = `${autonomos.length} dependencias`;

        // Renderizar secciones compactas (listas de dependencias)
        renderSectionCompact('list-centralizado', centralizadas);
        renderSectionCompact('list-paraestatal', paraestatales);
        renderSectionCompact('list-autonomo', autonomos);

        // Renderizar Barras de Estado General
        renderEstadoGeneralBars(centralizadas, paraestatales, autonomos);
      }
    } catch (error) {
      console.error('Error al cargar resumen de semáforo:', error);
    }
  }

  // Utilidad para renderizar las barras de estado agregado
  function renderEstadoGeneralBars(central, para, auto) {
    const div = document.getElementById('estado-general-bars');
    if (!div) return;

    const sections = [
      { title: 'A. Centralizada', data: central, count: central.length },
      { title: 'A. Paraestatal', data: para, count: para.length },
      { title: 'A. Autónomos', data: auto, count: auto.length }
    ];

    div.innerHTML = sections.map(sec => {
      // Calcular agregados por tipo de herramienta (primeras 4 barras según imagen)
      // Puntos: [Organigrama, RI/EO, Manual Org, Manual Proc, Manual Serv]
      const stats = [
        { label: 'Organigramas', icon: '📊', index: 0 },
        { label: 'Reglamentos / Estatutos', icon: '📄', index: 1 },
        { label: 'Manuales Org', icon: '📖', index: 2 },
        { label: 'Manuales Proc', icon: '⚙️', index: 3 }
      ].map(type => {
        const counts = { verde: 0, amarillo: 0, naranja: 0, rojo: 0 };
        sec.data.forEach(org => {
          const color = (org.detalles_semaforo?.puntos?.[type.index] || 'rojo').toLowerCase();
          if (counts[color] !== undefined) counts[color]++;
        });
        return { ...type, counts };
      });

      return `
        <div class="estado-seccion">
          <div class="estado-seccion-title">
            <span>${sec.title}</span>
            <span class="badge" style="background: #e2e8f0; color: #475569;">${sec.count} DEPS.</span>
          </div>
          <div class="bars-grid">
            ${stats.map(s => `
              <div class="bar-item">
                <div class="bar-label">${s.icon} ${s.label}</div>
                <div class="status-bar-container">
                  ${renderBarSubsegment(s.counts.verde, sec.count, 'verde')}
                  ${renderBarSubsegment(s.counts.amarillo, sec.count, 'amarillo')}
                  ${renderBarSubsegment(s.counts.naranja, sec.count, 'naranja')}
                  ${renderBarSubsegment(s.counts.rojo, sec.count, 'rojo')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderBarSubsegment(count, total, color) {
    if (count === 0) return '';
    const pct = (count / total) * 100;
    return `
      <div class="bar-segment segment-${color}" style="width: ${pct}%" 
           data-tooltip="${count} en ${color.toUpperCase()}">
        <span>${count}</span>
      </div>
    `;
  }

  // Función global para scroll suave
  window.scrollToSection = function (id) {
    const el = document.getElementById(`${id}-section`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      el.style.boxShadow = '0 0 20px var(--azul-claro)';
      setTimeout(() => el.style.boxShadow = '', 2000);
    }
  };

  // Renderizar sección compacta de organización
  function renderSectionCompact(containerId, lista) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (lista.length === 0) {
      container.innerHTML = '<p class="text-center p-20 text-muted" style="font-size: 0.8rem;">Sin registros</p>';
      return;
    }

    let html = '';
    lista.forEach(org => {
      const dotsHTML = renderizarSemaforoDots(org.detalles_semaforo?.puntos || [], org);
      html += `
        <div class="org-row-compact" onclick="verDetalleOrganizacion(${org.id})" style="cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div class="org-name-compact" title="${org.nombre}">${org.nombre}</div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="dot-container">
                ${dotsHTML}
              </div>
              <button onclick="event.stopPropagation(); descargarPDFOrganizacion(${org.id}, '${org.nombre.replace(/'/g, "\\'")}')" 
                 class="btn-export-pdf" 
                 style="font-size: 0.75rem; padding: 6px 12px; background: #DC2626; color: white; border-radius: 6px; border: none; cursor: pointer; font-weight: 600;" 
                 title="Exportar Informe PDF">
                📄 PDF
              </button>
            </div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // Utilidad para renderizar los círculos del semáforo (con tooltips)
  function renderizarSemaforoDots(puntos, org) {
    const labels = [
      'Organigrama',
      'Reglamento Interior / Estatuto Orgánico',
      'Manual de Organización',
      'Manual de Procedimientos',
      'Manual de Servicios'
    ];

    const requiereManual = org ? org.requiere_manual_servicios !== false : true;
    const count = requiereManual ? 5 : 4;

    if (!puntos || puntos.length === 0) {
      let emptyDots = '';
      for (let i = 0; i < count; i++) {
        emptyDots += '<span class="dot dot-vacio" data-tooltip="Sin información"></span>';
      }
      return emptyDots;
    }

    // Filtrar puntos si no requiere manual
    const puntosMostrar = org.requiere_manual_servicios ? puntos : puntos.slice(0, 4);

    return puntosMostrar.map((color, idx) => {
      const c = (color || 'vacio').toLowerCase();
      const label = labels[idx] || 'Herramienta';
      return `<span class="dot dot-${c}" data-tooltip="${label}: ${color || 'Pendiente'}"></span>`;
    }).join('');
  }

  // Cargar herramientas próximas a vencer
  async function cargarProximasVencer() {
    const resultado = await window.HerramientasModule.obtenerProximasVencer(12);

    if (resultado.success) {
      const herramientas = resultado.data;
      const container = document.getElementById('tabla-proximas-vencer');

      if (herramientas.length === 0) {
        container.innerHTML = `
          <div class="empty-state p-20 text-center">
            <p>No hay herramientas próximas a vencer o no hay datos registrados.</p>
          </div>
        `;
        return;
      }

      let html = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Dependencia/Entidad</th>
                <th>Tipo Herramienta</th>
                <th>Archivo</th>
                <th>Última Actualización</th>
              </tr>
            </thead>
            <tbody>
      `;

      herramientas.slice(0, 10).forEach(h => {
        html += `
          <tr>
            <td>${h.organizacion_nombre}</td>
            <td>${window.AppUtils.getNombreTipoHerramienta(h.tipo_herramienta)}</td>
            <td>${h.nombre_archivo}</td>
            <td>${window.AppUtils.formatearFechaCorta(h.fecha_actualizacion)}</td>
          </tr>
        `;
      });

      html += '</tbody></table></div>';
      container.innerHTML = html;
    }
  }

  // Cargar organizaciones en la tabla
  window.cargarOrganizaciones = async function () {
    const usuario = window.AuthModule.getUsuario();
    const isAdminOrCapturista = usuario && (usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'CAPTURISTA');

    const adminActions = document.getElementById('admin-actions-organizaciones');
    if (adminActions) {
      adminActions.style.display = isAdminOrCapturista ? 'block' : 'none';
    }

    const tipo = document.getElementById('filtro-tipo-org')?.value || null;
    const resultado = await window.OrganizacionesModule.obtenerTodas(tipo);

    if (resultado.success) {
      const container = document.getElementById('organizaciones-tabla-body');
      if (!container) return;

      let html = '';
      resultado.data.forEach(org => {
        html += `
          <tr>
            <td><strong>${org.nombre}</strong></td>
            <td>${window.AppUtils.getNombreTipoOrganizacion(org.tipo)}</td>
            <td>${org.titular || '-'}</td>
            <td>${window.AppUtils.getBadgeSemaforo(org.semaforo)}</td>
            <td>
              <div style="display: flex; gap: 5px;">
                <button class="btn btn-secondary btn-sm" onclick="verDetalleOrganizacion(${org.id})">Ver</button>
                ${isAdminOrCapturista ? `<button class="btn btn-primary btn-sm" onclick="mostrarModalEditarOrganizacion(${org.id})">Editar</button>` : ''}
              </div>
            </td>
          </tr>
        `;
      });
      container.innerHTML = html;
    } else {
      const container = document.getElementById('organizaciones-tabla-body');
      if (container) container.innerHTML = '<tr><td colspan="5" class="text-center text-error">Error al cargar dependencias</td></tr>';
    }
  };

  // Variable para almacenar el estado de organizaciones en herramientas
  let organizacionesHerramientas = [];
  let idDependenciaSeleccionada = null;

  // Refrescar vista de herramientas (Maestro-Detalle)
  async function refrescarVistaHerramientas() {
    const container = document.getElementById('lista-organizaciones-herramientas');
    if (!container) return;

    container.innerHTML = '<div class="spinner"></div>';

    const resultado = await window.OrganizacionesModule.obtenerTodas();
    if (resultado.success) {
      organizacionesHerramientas = resultado.data;
      renderizarListaOrganizacionesHerramientas(organizacionesHerramientas);

      // Si no hay nada seleccionado, mostrar estado vacío
      if (!idDependenciaSeleccionada) {
        document.getElementById('detalle-herramientas-dependencia').innerHTML = `
          <div class="empty-state">
            <p>Seleccione una dependencia de la lista para ver su información y herramientas organizacionales.</p>
          </div>
        `;
      }
    } else {
      container.innerHTML = '<p class="text-center text-error p-20">Error al cargar lista</p>';
    }
  }

  // Renderizar la lista de la izquierda
  function renderizarListaOrganizacionesHerramientas(lista) {
    const container = document.getElementById('lista-organizaciones-herramientas');
    if (lista.length === 0) {
      container.innerHTML = '<p class="text-center p-20">No se encontraron resultados</p>';
      return;
    }

    let html = '';
    lista.forEach(org => {
      const activeClass = idDependenciaSeleccionada == org.id ? 'active' : '';
      html += `
        <div class="list-group-item ${activeClass}" onclick="verHerramientasPorDependencia(${org.id})">
          <div style="flex: 1;">
            <div style="font-weight: 600;">${org.nombre}</div>
            <div style="font-size: 0.8rem; opacity: 0.8;">${org.siglas || AppUtils.getNombreTipoOrganizacion(org.tipo)}</div>
          </div>
          ${AppUtils.getBadgeSemaforo(org.semaforo)}
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // Filtrar lista
  window.filtrarOrganizacionesHerramientas = function () {
    const busqueda = document.getElementById('buscar-org-herramientas').value.toLowerCase();
    const filtradas = organizacionesHerramientas.filter(org =>
      org.nombre.toLowerCase().includes(busqueda) ||
      (org.siglas && org.siglas.toLowerCase().includes(busqueda))
    );
    renderizarListaOrganizacionesHerramientas(filtradas);
  };

  // Ver herramientas de una dependencia específica (Lado derecho)
  window.verHerramientasPorDependencia = async function (id) {
    idDependenciaSeleccionada = id;

    // Actualizar clase active en la lista
    document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active'));
    // Encontrar el elemento y activarlo (si existe en el DOM actual)
    // El renderizado lo hará la próxima vez, pero por ahora podemos navegar

    const container = document.getElementById('detalle-herramientas-dependencia');
    container.innerHTML = '<div class="spinner"></div>';

    const resultado = await window.OrganizacionesModule.obtenerPorId(id);
    if (resultado.success) {
      const org = resultado.data;

      // Actualizar título y botón de admin
      document.getElementById('titulo-dependencia-seleccionada').textContent = org.nombre;

      const usuario = window.AuthModule.getUsuario();
      const isAdminOrCapturista = usuario && (usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'CAPTURISTA');
      const adminActions = document.getElementById('admin-actions-herramientas');
      if (adminActions) adminActions.style.display = isAdminOrCapturista ? 'block' : 'none';

      let html = `
        <div class="card mb-20" style="background: var(--gris-claro); border: none; box-shadow: none;">
          <div class="p-20">
            <h4 style="color: var(--azul-institucional); margin-bottom: 10px;">Información General</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
              <div><strong>Titular:</strong> ${org.titular || 'No registrado'}</div>
              <div><strong>Siglas:</strong> ${org.siglas || 'N/A'}</div>
              <div><strong>Tipo:</strong> ${AppUtils.getNombreTipoOrganizacion(org.tipo)}</div>
              <div><strong>Semáforo:</strong> ${AppUtils.getBadgeSemaforo(org.semaforo)}</div>
            </div>
            <div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;">
                <button onclick="descargarPDFOrganizacion(${org.id}, '${org.nombre.replace(/'/g, "\\'")}')" class="btn btn-secondary" style="background: var(--primario); color: white; border: none; cursor: pointer;">📄 Exportar Informe Detallado (PDF)</button>
            </div>
            ${org.decreto_creacion ? `
              <div style="margin-top: 15px;">
                <strong>Decreto de Creación:</strong> 
                <a href="${org.decreto_creacion}" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-block; margin-left: 10px;">Ver Decreto 🔗</a>
              </div>
            ` : ''}
          </div>
        </div>

        <h4 style="margin-bottom: 20px; color: var(--azul-institucional);">Clasificación por Herramienta</h4>
        <div class="tool-card-grid">
      `;

      // Definir tipos de herramientas unificados para asegurar que aparezcan
      const tiposMostrar = ['ORGANIGRAMA', 'REGLAMENTO_ESTATUTO', 'MANUAL_ORGANIZACION', 'MANUAL_PROCEDIMIENTOS'];
      if (org.requiere_manual_servicios !== false) {
        tiposMostrar.push('MANUAL_SERVICIOS');
      }

      tiposMostrar.forEach(tipo => {
        // Buscar herramienta: si es REGLAMENTO_ESTATUTO, buscar cualquiera de los 3 posibles valores en DB
        let herramienta;
        if (tipo === 'REGLAMENTO_ESTATUTO') {
          herramienta = org.herramientas.find(h =>
            h.tipo_herramienta === 'REGLAMENTO_ESTATUTO' ||
            h.tipo_herramienta === 'REGLAMENTO_INTERIOR' ||
            h.tipo_herramienta === 'ESTATUTO_ORGANICO'
          );
        } else {
          herramienta = org.herramientas.find(h => h.tipo_herramienta === tipo);
        }

        if (herramienta) {
          html += `
            <div class="tool-item-card">
              <div class="tool-card-header">
                <div class="tool-card-title">${AppUtils.getNombreTipoHerramienta(herramienta.tipo_herramienta)}</div>
              </div>
              <div><strong>Estado:</strong> <span class="badge badge-verde">✓ Registrado</span></div>
              <div><strong>Fecha de publicación:</strong> ${AppUtils.formatearFechaCorta(herramienta.fecha_emision)}</div>
              <div style="display: flex; gap: 5px; margin-top: 10px;">
                <a href="${window.HerramientasModule.getUrlDescarga(herramienta.id)}" class="btn btn-success btn-sm" style="flex: 2; text-align: center;" target="_blank">Ver Documento 🔗</a>
                ${(isAdminOrCapturista && herramienta.id) ? `<button class="btn btn-primary btn-sm" style="flex: 1;" onclick="mostrarModalEditarHerramienta(${herramienta.id})">Editar</button>` : ''}
              </div>
            </div>
          `;
        } else {
          html += `
            <div class="tool-item-card" style="opacity: 0.6; background: #f9f9f9;">
              <div class="tool-card-header">
                <div class="tool-card-title">${AppUtils.getNombreTipoHerramienta(tipo)}</div>
              </div>
              <div><strong>Estado:</strong> <span class="badge" style="background: #ccc; color: white;">✗ Pendiente</span></div>
              <div style="font-size: 0.8rem; color: #666; margin-top: 5px;">No se ha cargado documento para esta categoría.</div>
            </div>
          `;
        }
      });

      html += '</div>';
      container.innerHTML = html;

      // Actualizar visual de la lista sin recargar
      const items = document.querySelectorAll('.list-group-item');
      items.forEach(el => {
        if (el.innerHTML.includes(org.nombre)) el.classList.add('active');
        else el.classList.remove('active');
      });
    } else {
      container.innerHTML = `<p class="p-20 text-center text-error">${resultado.error}</p>`;
    }
  };

  // Función para abrir modal de nueva herramienta con la org ya seleccionada
  window.hacerNuevaHerramientaConOrg = async function () {
    if (!idDependenciaSeleccionada) return;

    // Abrir modal normal
    await mostrarModalNuevaHerramienta();

    // Seleccionar la dependencia en el select
    const select = document.getElementById('select-organizacion');
    if (select) {
      select.value = idDependenciaSeleccionada;
    }
  };

  // Abrir modal de editar herramienta
  window.mostrarModalEditarHerramienta = async function (id) {
    if (!id || id === 'undefined') {
      console.error('ID de herramienta no válido para edición');
      return;
    }
    window.AppUtils.mostrarSpinner(true);
    try {
      const resultado = await window.HerramientasModule.obtenerPorId(id);
      if (resultado.success) {
        const h = resultado.data.herramienta; // CORRECCIÓN: Acceder al objeto 'herramienta'
        document.getElementById('edit-herramienta-id').value = h.id;
        document.getElementById('edit-herramienta-org-id').value = h.organizacion_id;
        document.getElementById('edit-herramienta-tipo').value = h.tipo_herramienta;
        document.getElementById('edit-herramienta-link').value = h.link_publicacion_poe || '';

        // Formatear fecha para el input date (YYYY-MM-DD)
        if (h.fecha_emision) {
          const dateObj = new Date(h.fecha_emision);
          if (!isNaN(dateObj.getTime())) {
            document.getElementById('edit-herramienta-fecha').value = dateObj.toISOString().split('T')[0];
          }
        } else {
          document.getElementById('edit-herramienta-fecha').value = '';
        }

        document.getElementById('edit-herramienta-estatus').value = h.estatus_poe || '';
        document.getElementById('edit-herramienta-comentarios').value = h.comentarios || '';
        document.getElementById('edit-herramienta-version').value = h.version || '1.0';

        // Mostrar/Ocultar botón de eliminar herramienta segun rol
        const btnEliminarTool = document.querySelector('#modal-editar-herramienta .btn-danger');
        if (btnEliminarTool) {
          const userRol = (window.AppUtils.AppState.usuario?.rol || '').toUpperCase();
          btnEliminarTool.style.display = userRol === 'ADMINISTRADOR' ? 'block' : 'none';
        }

        window.mostrarModal('modal-editar-herramienta');
      } else {
        window.AppUtils.mostrarAlerta(resultado.error, 'error');
      }
    } catch (error) {
      console.error(error);
      window.AppUtils.mostrarAlerta('Error al cargar datos de la herramienta', 'error');
    } finally {
      window.AppUtils.mostrarSpinner(false);
    }
  };

  // Guardar cambios de herramienta
  window.guardarCambiosHerramienta = async function (event) {
    event.preventDefault();
    const form = event.target;
    const id = document.getElementById('edit-herramienta-id').value;
    const orgId = document.getElementById('edit-herramienta-org-id').value;
    const formData = new FormData(form);

    // Validación manual: Si NO hay archivo nuevo Y el campo Link está vacío...
    // Validación manual: Si NO hay archivo nuevo Y el campo Link está vacío...
    const archivoInput = document.getElementById('edit-herramienta-archivo');
    const linkInput = document.getElementById('edit-herramienta-link');

    // Como no podemos saber fácilmente si ya tiene archivo previo sin consultar al objeto (que ya no tenemos aquí),
    // confiamos en que el backend validará si queda "huérfano".
    // Pero el backend mantiene el archivo anterior si no se envía nada.
    // El único riesgo es si el usuario BORRA el link y NO sube archivo, esperando que se quede el archivo anterior.
    // Eso es comportamiento válido (se mantiene archivo anterior).
    // Si quiere cambiar de archivo a link, pone link. El backend priorizará el link si no hay archivo?
    // Revisemos backend: "if (req.file) ... else if (link ...)".
    // Si pone link y no archivo, actualiza ruta_archivo al link. Correcto.

    window.AppUtils.mostrarSpinner(true);
    try {
      const resultado = await window.HerramientasModule.actualizar(id, formData);
      if (resultado.success) {
        window.AppUtils.mostrarAlerta('Herramienta actualizada exitosamente', 'success');
        window.cerrarModal('modal-editar-herramienta');
        // Recargar vista actual
        await window.verHerramientasPorDependencia(orgId);
        await cargarReporteGeneral();
      } else {
        window.AppUtils.mostrarAlerta(resultado.error, 'error');
      }
    } catch (error) {
      console.error(error);
      window.AppUtils.mostrarAlerta('Error de red al actualizar herramienta', 'error');
    } finally {
      window.AppUtils.mostrarSpinner(false);
    }
  };

  // Borrar herramienta definitivamente
  window.borrarHerramientaDefinitivamente = async function () {
    const id = document.getElementById('edit-herramienta-id').value;
    const orgId = document.getElementById('edit-herramienta-org-id').value;
    const tipo = document.getElementById('edit-herramienta-tipo').value;

    if (!confirm(`¿ESTÁ SEGURO? Esta acción eliminará permanentemente esta herramienta (${tipo}) e historial vinculado. Esta acción no se puede deshacer.`)) {
      return;
    }

    const confirmacionExtra = prompt(`Para confirmar la eliminación, escriba \"ELIMINAR\":`);
    if (confirmacionExtra !== 'ELIMINAR') {
      alert('Confirmación incorrecta.');
      return;
    }

    window.AppUtils.mostrarSpinner(true);
    try {
      const resultado = await window.HerramientasModule.eliminar(id);
      if (resultado.success) {
        window.AppUtils.mostrarAlerta('Herramienta eliminada exitosamente', 'success');
        window.cerrarModal('modal-editar-herramienta');
        // Recargar vista actual
        await window.verHerramientasPorDependencia(orgId);
        await cargarReporteGeneral();
      } else {
        window.AppUtils.mostrarAlerta(resultado.error, 'error');
      }
    } catch (error) {
      console.error(error);
      window.AppUtils.mostrarAlerta('Error al eliminar herramienta', 'error');
    } finally {
      window.AppUtils.mostrarSpinner(false);
    }
  };

  // Cargar herramientas en la tabla (LEGACY/BACKUP)
  window.cargarHerramientas = async function () {
    const resultado = await window.HerramientasModule.obtenerTodas();
    // ... mantengo por si acaso o redirijo
    refrescarVistaHerramientas();
  };

  // Cargar historial
  async function cargarHistorial() {
    const resultado = await window.ReportesModule.obtenerHistorial(50);

    if (resultado.success) {
      const historial = resultado.data;
      const container = document.getElementById('tabla-historial');

      if (historial.length === 0) {
        container.innerHTML = '<p class="text-center">No hay historial disponible</p>';
        return;
      }

      let html = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Organización</th>
                <th>Herramienta</th>
              </tr>
            </thead>
            <tbody>
      `;

      historial.forEach(h => {
        html += `
          <tr>
            <td>${window.AppUtils.formatearFechaCorta(h.fecha)}</td>
            <td>${h.usuario_nombre}</td>
            <td><span class="badge">${h.accion}</span></td>
            <td>${h.organizacion_nombre || '-'}</td>
            <td>${h.herramienta_nombre || '-'}</td>
          </tr>
        `;
      });

      html += '</tbody></table></div>';
      container.innerHTML = html;
    }
  }

  // Mostrar vista
  window.mostrarVista = function (vista, event) {
    // Ocultar todas las vistas
    document.querySelectorAll('[id^="vista-"]').forEach(el => {
      el.classList.add('hidden');
    });

    // Remover clase active de botones
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Mostrar vista seleccionada
    const vistaElement = document.getElementById(`vista-${vista}`);
    if (vistaElement) {
      vistaElement.classList.remove('hidden');
    }

    // Activar botón si hay evento
    if (event && event.currentTarget) {
      event.currentTarget.classList.add('active');
    }

    // Cargar datos según la vista
    switch (vista) {
      case 'dashboard':
        cargarReporteGeneral();
        break;
      case 'organizaciones':
        cargarOrganizaciones();
        break;
      case 'herramientas':
        refrescarVistaHerramientas();
        break;
      case 'expedientes':
        if (window.cargarExpedientes) window.cargarExpedientes();
        break;
      case 'usuarios':
        cargarUsuariosAdmin();
        break;
      // case 'expedientes' moved/merged to ensure valid call
      case 'cargas':
        cargarCargasTrabajo();
        break;
      case 'reportes':
        cargarHistorial();
        // Asegurar que mantenimiento sea visible para admins si cambian de vista
        const getUsuarioVista = window.AuthModule.getUsuario || (() => window.AppUtils.AppState.usuario);
        const usuarioVista = getUsuarioVista();
        const maintenanceSection = document.getElementById('admin-maintenance-section');
        if (maintenanceSection) {
          maintenanceSection.style.display = (usuarioVista && usuarioVista.rol === 'ADMINISTRADOR') ? 'block' : 'none';
        }
        break;
    }

    AppState.currentView = vista;
  };

  // Mostrar modal
  window.mostrarModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  };

  // Cerrar modal
  window.cerrarModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  };

  // Modal nueva organización
  window.mostrarModalNuevaOrganizacion = function () {
    mostrarModal('modal-nueva-organizacion');
  };

  // Modal nueva herramienta
  window.mostrarModalNuevaHerramienta = async function () {
    // Cargar organizaciones en el select
    const resultado = await window.OrganizacionesModule.obtenerTodas();
    if (resultado.success) {
      const select = document.getElementById('select-organizacion');
      select.innerHTML = '<option value="">Seleccione...</option>';
      resultado.data.forEach(org => {
        select.innerHTML += `<option value="${org.id}">${org.nombre}</option>`;
      });
    }
    mostrarModal('modal-nueva-herramienta');
  };

  // Configurar eventos
  function configurarEventos() {
    // Form nueva organización
    document.getElementById('form-nueva-organizacion').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const organizacion = Object.fromEntries(formData);
      organizacion.requiere_manual_servicios = organizacion.requiere_manual_servicios === 'true';

      const resultado = await window.OrganizacionesModule.crear(organizacion);

      if (resultado.success) {
        window.AppUtils.mostrarAlerta('Se ha registrado la Dependencia/Entidad exitosamente', 'success');
        cerrarModal('modal-nueva-organizacion');
        e.target.reset();
        cargarOrganizaciones();
      } else {
        window.AppUtils.mostrarAlerta(resultado.error, 'error');
      }
    });

    // Form nueva herramienta
    document.getElementById('form-nueva-herramienta').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      const resultado = await window.HerramientasModule.crear(formData);

      if (resultado.success) {
        window.AppUtils.mostrarAlerta('Herramienta creada exitosamente', 'success');
        cerrarModal('modal-nueva-herramienta');
        e.target.reset();
        refrescarVistaHerramientas();
      } else {
        window.AppUtils.mostrarAlerta(resultado.error, 'error');
      }
    });

    // Form editar organización
    document.getElementById('form-editar-organizacion').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const id = formData.get('id');
      const organizacion = Object.fromEntries(formData);
      organizacion.requiere_manual_servicios = organizacion.requiere_manual_servicios === 'true';
      delete organizacion.id;

      const resultado = await window.OrganizacionesModule.actualizar(id, organizacion);

      if (resultado.success) {
        window.AppUtils.mostrarAlerta('Dependencia/Entidad actualizada correctamente', 'success');
        cerrarModal('modal-editar-organizacion');
        cargarOrganizaciones();
      } else {
        window.AppUtils.mostrarAlerta(resultado.error, 'error');
      }
    });

    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
  }

  // Ver detalle de Dependencia/Entidad
  window.verDetalleOrganizacion = async function (id) {
    const resultado = await window.OrganizacionesModule.obtenerPorId(id);
    if (resultado.success) {
      const org = resultado.data;

      // Llenar datos básicos
      document.getElementById('detalle-org-nombre').textContent = org.nombre;
      document.getElementById('detalle-org-tipo').textContent = window.AppUtils.getNombreTipoOrganizacion(org.tipo);
      document.getElementById('detalle-org-titular').textContent = org.titular || 'No registrado';
      document.getElementById('detalle-org-siglas').textContent = org.siglas || 'N/A';

      const badgeSemaforo = document.getElementById('detalle-org-semaforo');
      badgeSemaforo.innerHTML = window.AppUtils.getBadgeSemaforo(org.semaforo);

      // Decreto de creación
      const decretoLink = document.getElementById('detalle-org-decreto');
      const containerDecreto = document.getElementById('container-decreto');
      if (org.decreto_creacion && org.decreto_creacion.startsWith('http')) {
        decretoLink.href = org.decreto_creacion;
        containerDecreto.style.display = 'block';
      } else {
        containerDecreto.style.display = 'none';
      }

      // Lista de herramientas
      const herramientasList = document.getElementById('detalle-org-herramientas-lista');
      if (org.herramientas.length === 0) {
        herramientasList.innerHTML = `
          <div class="p-20 text-center">
            <p class="mb-10 text-muted">No hay herramientas registradas para esta dependencia.</p>
            <button class="btn btn-primary btn-sm" onclick="window.mostrarModalNuevaHerramienta()">Registrar Herramienta</button>
          </div>
        `;
      } else {
        let html = `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Tipo</th>
                                    <th>Fecha</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

        org.herramientas.forEach(h => {
          html += `
                        <tr>
                            <td>${window.AppUtils.getNombreTipoHerramienta(h.tipo_herramienta)}</td>
                            <td>${window.AppUtils.formatearFechaCorta(h.fecha_emision)}</td>
                            <td style="display: flex; gap: 5px;">
                                <a href="${window.HerramientasModule.getUrlDescarga(h.id)}" class="btn btn-success btn-sm" target="_blank" title="Descargar">📥</a>
                                ${h.link_publicacion_poe ? `<a href="${h.link_publicacion_poe}" class="btn btn-secondary btn-sm" target="_blank" title="Ver POE">🔗</a>` : ''}
                            </td>
                        </tr>
                    `;
        });

        html += '</tbody></table></div>';
        herramientasList.innerHTML = html;
      }

      window.mostrarModal('modal-detalle-organizacion');
    } else {
      window.AppUtils.mostrarAlerta(resultado.error, 'error');
    }
  };

  // Mostrar modal para editar organización
  window.mostrarModalEditarOrganizacion = async function (id) {
    const usuario = window.AuthModule.getUsuario();
    if (!usuario || usuario.rol !== 'ADMINISTRADOR') {
      window.AppUtils.mostrarAlerta('No tienes permisos para realizar esta acción', 'error');
      return;
    }

    const resultado = await window.OrganizacionesModule.obtenerPorId(id);
    if (resultado.success) {
      const org = resultado.data;
      document.getElementById('edit-org-id').value = org.id;
      document.getElementById('edit-org-nombre').value = org.nombre;
      document.getElementById('edit-org-tipo').value = org.tipo;
      document.getElementById('edit-org-siglas').value = org.siglas || '';
      document.getElementById('edit-org-titular').value = org.titular || '';
      document.getElementById('edit-org-decreto').value = org.decreto_creacion || '';

      // Toggles de manual de servicios
      if (org.requiere_manual_servicios === false) {
        document.getElementById('edit-org-manual-no').checked = true;
      } else {
        document.getElementById('edit-org-manual-si').checked = true;
      }

      // Mostrar botón de eliminar solo para admins
      const btnEliminar = document.getElementById('btn-eliminar-organizacion');
      if (btnEliminar) btnEliminar.style.display = 'block';

      window.mostrarModal('modal-editar-organizacion');
    } else {
      window.AppUtils.mostrarAlerta(resultado.error, 'error');
    }
  };

  // Función para borrar organización definitivamente
  window.borrarOrganizacionDefinitivamente = async function () {
    const id = document.getElementById('edit-org-id').value;
    const nombre = document.getElementById('edit-org-nombre').value;

    if (!confirm(`¿ESTÁ SEGURO? Esta acción eliminará permanentemente la dependencia "${nombre}" y TODAS sus herramientas e historial vinculados. Esta acción no se puede deshacer.`)) {
      return;
    }

    const confirmacionExtra = prompt(`Para confirmar la eliminación de "${nombre}", escriba "ELIMINAR" (en mayúsculas):`);
    if (confirmacionExtra !== 'ELIMINAR') {
      alert('Confirmación incorrecta.');
      return;
    }

    window.AppUtils.mostrarSpinner(true);
    try {
      const resultado = await window.OrganizacionesModule.eliminar(id);

      if (resultado.success) {
        window.AppUtils.mostrarAlerta('Dependencia eliminada por completo', 'success');
        cerrarModal('modal-editar-organizacion');
        // Recargar dashboard y lista
        await cargarReporteGeneral();
        cargarOrganizaciones();
      } else {
        window.AppUtils.mostrarAlerta(resultado.error, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      window.AppUtils.mostrarAlerta('Error de conexión al servidor', 'error');
    } finally {
      window.AppUtils.mostrarSpinner(false);
    }
  };

  // Función para reiniciar la base de datos
  window.resetearBaseDeDatos = async function () {
    if (!confirm('¿ESTÁ SEGURO? Esta acción eliminará TODAS las dependencias y herramientas permanentemente.')) {
      return;
    }

    const confirmacionExtra = prompt('Para confirmar, escriba "ELIMINAR TODO" (en mayúsculas):');
    if (confirmacionExtra !== 'ELIMINAR TODO') {
      alert('Confirmación incorrecta.');
      return;
    }

    window.AppUtils.mostrarSpinner(true);
    try {
      const resultado = await window.AppUtils.fetchAPI('/admin/clear-database', {
        method: 'POST'
      });

      if (resultado && resultado.success) {
        window.AppUtils.mostrarAlerta(resultado.message, 'success');
        // Redirigir al dashboard y recargar
        window.mostrarVista('dashboard');
        await initApp();
      } else {
        window.AppUtils.mostrarAlerta(resultado?.error || 'Error al limpiar base de datos', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      window.AppUtils.mostrarAlerta('Error de conexión al servidor', 'error');
    } finally {
      window.AppUtils.mostrarSpinner(false);
    }
  };
  // Interactividad del Tablero (Drill-down)
  window.interactuarDashboard = function (tipo) {
    const grid = document.getElementById('trapecios-grid');
    const mainTitle = document.getElementById('dashboard-main-title');
    const estadoGeneral = document.getElementById('estado-general-card');
    const proximasVencer = document.getElementById('proximas-vencer-card');
    const drilldownHeader = document.getElementById('dashboard-drilldown-header');
    const drilldownTitle = document.getElementById('dashboard-drilldown-title');

    // Ocultar elementos globales
    if (grid) grid.classList.add('hidden');
    if (mainTitle) mainTitle.classList.add('hidden');
    if (estadoGeneral) estadoGeneral.classList.add('hidden');
    if (proximasVencer) proximasVencer.classList.add('hidden');

    // Mostrar header de drilldown
    if (drilldownHeader) drilldownHeader.classList.remove('hidden');

    // Configurar título y mostrar sección correspondiente
    const titulos = {
      'centralizado': 'Sector Centralizado',
      'paraestatal': 'Sector Paraestatal',
      'autonomo': 'Organismos Autónomos'
    };
    if (drilldownTitle) drilldownTitle.textContent = titulos[tipo] || 'Detalle del Sector';

    // Ocultar todas las secciones de listas primero
    ['centralizado', 'paraestatal', 'autonomo'].forEach(t => {
      const section = document.getElementById(`list-${t}-section`);
      if (section) section.classList.add('hidden');
    });

    // Mostrar la seleccionada
    const targetSection = document.getElementById(`list-${tipo}-section`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Función para ver detalle de organización desde el dashboard
  window.verDetalleOrganizacion = function (id) {
    // Cambiar a la vista de herramientas
    window.mostrarVista('herramientas');
    // Esperar un momento para que la vista se cargue y luego mostrar el detalle
    setTimeout(() => {
      window.verHerramientasPorDependencia(id);
    }, 100);
  };

  // Función para cargar expedientes
  window.cargarExpedientes = async function () {
    try {
      const data = await window.ExpedientesModule.obtenerTodos();
      if (data && data.expedientes) {
        window.ExpedientesModule.renderizarLista(data.expedientes);
      } else {
        const container = document.getElementById('expedientes-lista');
        if (container) {
          container.innerHTML = '<p class="text-center p-20">No hay expedientes registrados.</p>';
        }
      }
    } catch (error) {
      console.error('Error al cargar expedientes:', error);
      const container = document.getElementById('expedientes-lista');
      if (container) {
        container.innerHTML = '<p class="text-center p-20 text-error">Error al cargar expedientes.</p>';
      }
    }
  };

  // Función para descargar PDF con autenticación
  window.descargarPDFOrganizacion = function (id, nombre) {
    const url = `/api/reportes/exportar/organizacion/${id}`;
    const authenticatedUrl = window.AppUtils.getAuthenticatedUrl(url);
    window.open(authenticatedUrl, '_blank');
  };

  window.regresarTableroGlobal = function () {
    const grid = document.getElementById('trapecios-grid');
    const mainTitle = document.getElementById('dashboard-main-title');
    const estadoGeneral = document.getElementById('estado-general-card');
    const proximasVencer = document.getElementById('proximas-vencer-card');
    const drilldownHeader = document.getElementById('dashboard-drilldown-header');

    // Mostrar elementos globales
    if (grid) grid.classList.remove('hidden');
    if (mainTitle) mainTitle.classList.remove('hidden');
    if (estadoGeneral) estadoGeneral.classList.remove('hidden');
    if (proximasVencer) proximasVencer.classList.remove('hidden');

    // Ocultar drilldown
    if (drilldownHeader) drilldownHeader.classList.add('hidden');

    // Mostrar todas las secciones de nuevo (opcional) o mantenerlas ocultas hasta el próximo clic
    // Para que no se vea el "scroll" largo, las mantendremos ocultas por defecto en el estado global
    ['centralizado', 'paraestatal', 'autonomo'].forEach(t => {
      const section = document.getElementById(`list-${t}-section`);
      if (section) section.classList.add('hidden');
    });
  };

  // Cargar estadísticas de carga de trabajo (Admin)
  async function cargarCargasTrabajo() {
    const container = document.getElementById('cargas-tabla-body');
    if (!container) return;

    try {
      const response = await fetch('/api/search/cargas-trabajo', {
        headers: { 'Authorization': `Bearer ${window.AppUtils.AppState.token}` }
      });
      const data = await response.json();

      if (!data.cargas || data.cargas.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="text-center">No hay datos de actividad disponibles.</td></tr>';
        return;
      }

      container.innerHTML = data.cargas.map(c => `
        <tr>
          <td>
            <strong>${c.nombre_completo}</strong><br>
            <small class="badge">${c.rol}</small>
          </td>
          <td class="text-center">${c.total_herramientas}</td>
          <td class="text-center">${c.total_expedientes}</td>
          <td>
            <div style="font-size: 0.8rem;">
              H: ${c.ultima_act_herramienta ? new Date(c.ultima_act_herramienta).toLocaleString() : 'N/A'}<br>
              E: ${c.ultima_act_expediente ? new Date(c.ultima_act_expediente).toLocaleString() : 'N/A'}
            </div>
          </td>
        </tr>
      `).join('');
    } catch (error) {
      console.error(error);
      container.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar estadísticas.</td></tr>';
    }
  }

  // Cargar lista de expedientes
  window.cargarExpedientes = async function () {
    const listado = document.getElementById('listado-expedientes');
    if (!listado) return;

    const data = await window.ExpedientesModule.obtenerTodos();
    window.ExpedientesModule.renderizarLista(data.expedientes);
  };

  // Funciones de utilidad para modales de expedientes
  // Funciones de utilidad para modales de expedientes
  window.mostrarModalNuevoExpediente = async function () {
    const select = document.getElementById('select-organizacion-expediente');
    if (select && select.options.length <= 1) {
      // Cargar organizaciones si no están
      try {
        const orgs = await window.OrganizacionesModule.obtenerTodas();
        select.innerHTML = '<option value="">Seleccione una dependencia...</option>' +
          orgs.map(o => `<option value="${o.id}">${o.nombre}</option>`).join('');
      } catch (e) { console.error(e); }
    }
    window.mostrarModal('modal-nuevo-expediente');
  };

  window.handleCrearExpediente = async function (e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const datos = Object.fromEntries(formData.entries());

    // Valores por defecto
    datos.estatus = 'EN_REVISION';
    datos.porcentaje_progreso = 0;

    window.AppUtils.mostrarSpinner(true);
    try {
      const resultado = await window.ExpedientesModule.crear(datos);
      if (resultado && !resultado.error) {
        window.AppUtils.mostrarAlerta('Expediente creado exitosamente', 'success');
        window.cerrarModal('modal-nuevo-expediente');
        form.reset();
        if (window.cargarExpedientes) window.cargarExpedientes();
      } else {
        window.AppUtils.mostrarAlerta(resultado.error || 'Error al crear', 'error');
      }
    } catch (error) {
      console.error(error);
      window.AppUtils.mostrarAlerta('Error de conexión', 'error');
    } finally {
      window.AppUtils.mostrarSpinner(false);
    }
  };

})();
// Función para togglear campos de manual
window.toggleCamposManual = function (tipo) {
  const preguntaDiv = document.getElementById('pregunta-manual-servicios');
  const camposDiv = document.getElementById('campos-herramienta-archivo');
  const radios = document.getElementsByName('req_manual');

  if (tipo === 'MANUAL_SERVICIOS') {
    preguntaDiv.classList.remove('hidden');
    // Reset radios
    radios.forEach(r => r.checked = false);
    // Hide fields initially until Yes/No is picked
    camposDiv.classList.add('hidden');
    toggleInputsRequired(false);
  } else {
    preguntaDiv.classList.add('hidden');
    camposDiv.classList.remove('hidden');
    toggleInputsRequired(true);
  }
};

window.toggleInputsManual = function (show) {
  const camposDiv = document.getElementById('campos-herramienta-archivo');
  if (show) {
    camposDiv.classList.remove('hidden');
    toggleInputsRequired(true);
  } else {
    camposDiv.classList.add('hidden');
    toggleInputsRequired(false);
  }
};

function toggleInputsRequired(isRequired) {
  const linkInput = document.getElementById('input-link-herramienta');
  const fechaInput = document.getElementById('input-fecha-herramienta');

  if (linkInput) linkInput.required = isRequired;
  if (fechaInput) fechaInput.required = isRequired;
}

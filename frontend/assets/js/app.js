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
    window.mostrarVista('organizaciones');

    // Configurar visibilidad de mantenimiento para administradores
    const getUsuario = window.AuthModule.getUsuario || (() => window.AppUtils.AppState.usuario);
    const usuario = getUsuario();
    if (usuario && usuario.rol === 'ADMINISTRADOR') {
      const maintenanceSection = document.getElementById('admin-maintenance-section');
      if (maintenanceSection) maintenanceSection.style.display = 'block';
    }

    // Al cargar, inicializar estado de navegación
    AppState.currentView = 'organizaciones';
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

  // Cargar resumen de semáforo
  async function cargarResumenSemaforo() {
    const container = document.getElementById('tabla-semaforo');
    container.innerHTML = '<div class="spinner"></div>';

    // Para el dashboard, solo cargamos los primeros 10 para rapidez
    const resultado = await window.OrganizacionesModule.obtenerTodas(null, 10, 0);

    if (resultado.success) {
      const organizaciones = resultado.data;

      if (organizaciones.length === 0) {
        container.innerHTML = `
          <div class="empty-state p-40 text-center">
            <p class="mb-20">No hay Dependencias/Entidades registradas aún.</p>
            <button class="btn btn-primary" onclick="window.mostrarModal('modal-nueva-organizacion')">➕ Registrar Primera Dependencia</button>
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
                <th>Tipo</th>
                <th>Semáforo</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
      `;

      organizaciones.forEach(org => {
        html += `
          <tr>
            <td><strong>${org.nombre}</strong></td>
            <td>${window.AppUtils.getNombreTipoOrganizacion(org.tipo)}</td>
            <td>${window.AppUtils.getBadgeSemaforo(org.semaforo)}</td>
            <td>${org.detalles_semaforo?.mensaje || 'Sin detalles'}</td>
          </tr>
        `;
      });

      html += '</tbody></table></div>';

      // Agregar indicador de que es un resumen
      html += `
        <div class="text-center mt-10">
          <p style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">Mostrando las primeras 10 dependencias de la lista.</p>
          <button class="btn btn-primary" onclick="mostrarVista('organizaciones', event)">Ver Todas las Dependencias</button>
        </div>
      `;

      container.innerHTML = html;
    }
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
    const isAdmin = usuario && usuario.rol === 'ADMINISTRADOR';

    const adminActions = document.getElementById('admin-actions-organizaciones');
    if (adminActions) {
      adminActions.style.display = isAdmin ? 'block' : 'none';
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
                ${isAdmin ? `<button class="btn btn-primary btn-sm" onclick="mostrarModalEditarOrganizacion(${org.id})">Editar</button>` : ''}
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
      const isAdmin = usuario && usuario.rol === 'ADMINISTRADOR';
      const adminActions = document.getElementById('admin-actions-herramientas');
      if (adminActions) adminActions.style.display = isAdmin ? 'block' : 'none';

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

      // Definir tipos de herramientas para asegurar que aparezcan aunque no tengan archivo
      const tiposOmitidos = ['ORGANIGRAMA', 'REGLAMENTO_INTERIOR', 'ESTATUTO_ORGANICO', 'MANUAL_ORGANIZACION', 'MANUAL_PROCEDIMIENTOS', 'MANUAL_SERVICIOS'];

      tiposOmitidos.forEach(tipo => {
        const herramienta = org.herramientas.find(h => h.tipo_herramienta === tipo);

        if (herramienta) {
          html += `
            <div class="tool-item-card">
              <div class="tool-card-header">
                <div class="tool-card-title">${AppUtils.getNombreTipoHerramienta(tipo)}</div>
              </div>
              <div><strong>Estado:</strong> <span class="badge badge-verde">✓ Registrado</span></div>
              <div><strong>Fecha:</strong> ${AppUtils.formatearFechaCorta(herramienta.fecha_emision)}</div>
              <div style="display: flex; gap: 5px; margin-top: 10px;">
                <a href="${window.HerramientasModule.getUrlDescarga(herramienta.id)}" class="btn btn-success btn-sm" style="flex: 1; text-align: center;" target="_blank">Ver Documento 🔗</a>
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

})();

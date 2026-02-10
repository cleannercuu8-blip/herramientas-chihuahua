// Aplicación principal
(function () {
  'use strict';

  // Verificar autenticación al cargar
  if (!window.AppUtils.verificarAutenticacion()) {
    return;
  }

  // Inicializar aplicación
  document.addEventListener('DOMContentLoaded', () => {
    cargarDashboard();
    configurarEventos();
  });

  // Cargar dashboard
  async function cargarDashboard() {
    await Promise.all([
      cargarEstadisticas(),
      cargarResumenSemaforo(),
      cargarProximasVencer()
    ]);
  }

  // Cargar estadísticas
  async function cargarEstadisticas() {
    const resultado = await window.OrganizacionesModule.obtenerEstadisticas();

    if (resultado.success) {
      const stats = resultado.data;
      const statsGrid = document.getElementById('stats-grid');

      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-number" style="color: var(--azul-institucional);">${stats.total}</div>
          <div class="stat-label">Total Organizaciones</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: var(--verde-cumplimiento);">${stats.verde}</div>
          <div class="stat-label">En Cumplimiento</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: var(--amarillo-advertencia);">${stats.amarillo}</div>
          <div class="stat-label">Con Advertencias</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: var(--rojo-incumplimiento);">${stats.rojo}</div>
          <div class="stat-label">Incumplimiento</div>
        </div>
      `;
    }
  }

  // Cargar resumen de semáforo
  async function cargarResumenSemaforo() {
    const resultado = await window.OrganizacionesModule.obtenerTodas();

    if (resultado.success) {
      const organizaciones = resultado.data;
      const container = document.getElementById('tabla-semaforo');

      if (organizaciones.length === 0) {
        container.innerHTML = '<p class="text-center">No hay organizaciones registradas</p>';
        return;
      }

      let html = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Organización</th>
                <th>Tipo</th>
                <th>Semáforo</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
      `;

      organizaciones.slice(0, 10).forEach(org => {
        html += `
          <tr>
            <td><strong>${org.nombre}</strong></td>
            <td>${window.AppUtils.getNombreTipoOrganizacion(org.tipo)}</td>
            <td>${window.AppUtils.getBadgeSemaforo(org.semaforo)}</td>
            <td>${org.detalles_semaforo.mensaje}</td>
          </tr>
        `;
      });

      html += '</tbody></table></div>';
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
        container.innerHTML = '<p class="text-center">No hay herramientas próximas a vencer</p>';
        return;
      }

      let html = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Organización</th>
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

  // Cargar organizaciones
  window.cargarOrganizaciones = async function () {
    const tipo = document.getElementById('filtro-tipo-org')?.value || null;
    const resultado = await window.OrganizacionesModule.obtenerTodas(tipo);

    if (resultado.success) {
      const organizaciones = resultado.data;
      const container = document.getElementById('tabla-organizaciones');

      if (organizaciones.length === 0) {
        container.innerHTML = '<p class="text-center">No hay organizaciones registradas</p>';
        return;
      }

      let html = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Titular</th>
                <th>Semáforo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
      `;

      organizaciones.forEach(org => {
        html += `
          <tr>
            <td><strong>${org.nombre}</strong></td>
            <td>${window.AppUtils.getNombreTipoOrganizacion(org.tipo)}</td>
            <td>${org.titular || '-'}</td>
            <td>${window.AppUtils.getBadgeSemaforo(org.semaforo)}</td>
            <td>
              <button class="btn btn-secondary" onclick="verDetalleOrganizacion(${org.id})">Ver Detalles</button>
            </td>
          </tr>
        `;
      });

      html += '</tbody></table></div>';
      container.innerHTML = html;
    }
  };

  // Cargar herramientas
  window.cargarHerramientas = async function () {
    const resultado = await window.HerramientasModule.obtenerTodas();

    if (resultado.success) {
      const herramientas = resultado.data;
      const container = document.getElementById('tabla-herramientas');

      if (herramientas.length === 0) {
        container.innerHTML = '<p class="text-center">No hay herramientas registradas</p>';
        return;
      }

      let html = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Organización</th>
                <th>Tipo</th>
                <th>Archivo</th>
                <th>Fecha Emisión</th>
                <th>POE</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
      `;

      herramientas.forEach(h => {
        html += `
          <tr>
            <td>${h.organizacion_nombre}</td>
            <td>${window.AppUtils.getNombreTipoHerramienta(h.tipo_herramienta)}</td>
            <td>${h.nombre_archivo}</td>
            <td>${window.AppUtils.formatearFechaCorta(h.fecha_emision)}</td>
            <td>
              <span class="badge" style="background-color: ${h.estatus_poe && h.estatus_poe.includes('PUBLICADO') ? 'var(--verde-cumplimiento)' : 'var(--gris-suave)'}; color: white;">
                ${h.estatus_poe || (h.fecha_publicacion_poe ? 'PUBLICADO' : 'PENDIENTE')}
              </span>
            </td>
            <td>
              <div style="display: flex; gap: 5px;">
                <a href="${window.HerramientasModule.getUrlDescarga(h.id)}" 
                   class="btn btn-success btn-sm" 
                   target="_blank">
                   📥
                </a>
                ${h.link_publicacion_poe ? `<a href="${h.link_publicacion_poe}" class="btn btn-secondary btn-sm" target="_blank" title="Ver POE">🔗</a>` : ''}
              </div>
            </td>
          </tr>
        `;
      });

      html += '</tbody></table></div>';
      container.innerHTML = html;
    }
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
  window.mostrarVista = function (vista) {
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

    // Activar botón
    event.target.classList.add('active');

    // Cargar datos según la vista
    switch (vista) {
      case 'dashboard':
        cargarDashboard();
        break;
      case 'organizaciones':
        cargarOrganizaciones();
        break;
      case 'herramientas':
        cargarHerramientas();
        break;
      case 'reportes':
        cargarHistorial();
        break;
    }
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
        window.AppUtils.mostrarAlerta('Organización creada exitosamente', 'success');
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
        cargarHerramientas();
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

  // Ver detalle de organización
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
        herramientasList.innerHTML = '<p class="p-20 text-center">No hay herramientas registradas</p>';
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

})();

// Funciones para el dashboard - Resumen de Expedientes y KPIs

// Cargar resumen de expedientes por prioridad
async function cargarResumenExpedientes() {
    try {
        const data = await window.AppUtils.fetchAPI('/expedientes');
        const expedientes = data.expedientes || [];

        const porPrioridad = {
            ALTA: expedientes.filter(e => e.prioridad === 'ALTA' && e.estatus === 'ABIERTO'),
            MEDIA: expedientes.filter(e => e.prioridad === 'MEDIA' && e.estatus === 'ABIERTO'),
            BAJA: expedientes.filter(e => e.prioridad === 'BAJA' && e.estatus === 'ABIERTO')
        };

        const totalAbiertos = expedientes.filter(e => e.estatus === 'ABIERTO').length;
        const totalCerrados = expedientes.filter(e => e.estatus === 'CERRADO').length;

        const container = document.getElementById('resumen-expedientes-content');
        container.innerHTML = `
      <div style="display: grid; gap: 15px;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div style="text-align: center; padding: 15px; background: #EFF6FF; border-radius: 8px;">
            <div style="font-size: 2rem; font-weight: 700; color: #3B82F6;">${totalAbiertos}</div>
            <div style="font-size: 0.85rem; color: #64748b;">Abiertos</div>
          </div>
          <div style="text-align: center; padding: 15px; background: #F1F5F9; border-radius: 8px;">
            <div style="font-size: 2rem; font-weight: 700; color: #64748b;">${totalCerrados}</div>
            <div style="font-size: 0.85rem; color: #64748b;">Cerrados</div>
          </div>
        </div>
        <div style="border-top: 1px solid #E2E8F0; padding-top: 15px;">
          <h4 style="font-size: 0.9rem; color: #64748b; margin-bottom: 10px;">Por Prioridad</h4>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #FEE2E2; border-radius: 6px; margin-bottom: 8px; cursor: pointer;" onclick="window.ExpedientesModule.mostrarReportePrioridades()">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">🔴</span>
              <span style="font-weight: 600; color: #991B1B;">Alta</span>
            </div>
            <span style="font-size: 1.5rem; font-weight: 700; color: #991B1B;">${porPrioridad.ALTA.length}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #FEF3C7; border-radius: 6px; margin-bottom: 8px; cursor: pointer;" onclick="window.ExpedientesModule.mostrarReportePrioridades()">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">🟡</span>
              <span style="font-weight: 600; color: #92400E;">Media</span>
            </div>
            <span style="font-size: 1.5rem; font-weight: 700; color: #92400E;">${porPrioridad.MEDIA.length}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #D1FAE5; border-radius: 6px; cursor: pointer;" onclick="window.ExpedientesModule.mostrarReportePrioridades()">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">🟢</span>
              <span style="font-weight: 600; color: #065F46;">Baja</span>
            </div>
            <span style="font-size: 1.5rem; font-weight: 700; color: #065F46;">${porPrioridad.BAJA.length}</span>
          </div>
        </div>
        <button class="btn btn-secondary w-100" onclick="window.ExpedientesModule.mostrarReportePrioridades()" style="margin-top: 10px;">
          📊 Ver Reporte Completo
        </button>
      </div>
    `;
    } catch (error) {
        console.error('Error al cargar resumen de expedientes:', error);
        const container = document.getElementById('resumen-expedientes-content');
        container.innerHTML = '<p class="text-center text-muted">Error al cargar datos</p>';
    }
}

// Cargar indicadores clave (KPIs)
async function cargarKPIs() {
    try {
        const [orgData, expData] = await Promise.all([
            window.AppUtils.fetchAPI('/organizaciones'),
            window.AppUtils.fetchAPI('/expedientes')
        ]);

        const organizaciones = orgData.organizaciones || [];
        const expedientes = expData.expedientes || [];

        const totalOrgs = organizaciones.length;
        const orgsVerde = organizaciones.filter(o => o.semaforo === 'VERDE').length;
        const tasaCumplimiento = totalOrgs > 0 ? Math.round((orgsVerde / totalOrgs) * 100) : 0;

        const orgsRojo = organizaciones.filter(o => o.semaforo === 'ROJO').length;
        const orgsSinExpediente = organizaciones.filter(o => {
            return !expedientes.some(e => e.organizacion_id === o.id);
        }).length;

        const expedientesActivos = expedientes.filter(e => e.estatus === 'ABIERTO').length;

        const container = document.getElementById('kpis-content');
        container.innerHTML = `
      <div style="display: grid; gap: 12px;">
        <div style="padding: 15px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 8px; color: white;">
          <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 5px;">Tasa de Cumplimiento</div>
          <div style="font-size: 2.5rem; font-weight: 700;">${tasaCumplimiento}%</div>
          <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 5px;">${orgsVerde} de ${totalOrgs} organizaciones</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div style="padding: 12px; background: #FEE2E2; border-radius: 6px; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 700; color: #991B1B;">${orgsRojo}</div>
            <div style="font-size: 0.75rem; color: #991B1B; margin-top: 3px;">Incumplimiento</div>
          </div>
          <div style="padding: 12px; background: #DBEAFE; border-radius: 6px; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 700; color: #1E40AF;">${expedientesActivos}</div>
            <div style="font-size: 0.75rem; color: #1E40AF; margin-top: 3px;">Expedientes Activos</div>
          </div>
          <div style="padding: 12px; background: #FEF3C7; border-radius: 6px; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 700; color: #92400E;">${orgsSinExpediente}</div>
            <div style="font-size: 0.75rem; color: #92400E; margin-top: 3px;">Sin Expediente</div>
          </div>
          <div style="padding: 12px; background: #E0E7FF; border-radius: 6px; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 700; color: #4338CA;">${totalOrgs}</div>
            <div style="font-size: 0.75rem; color: #4338CA; margin-top: 3px;">Total Organizaciones</div>
          </div>
        </div>
        <div style="margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-bottom: 5px;">
            <span>Progreso General</span>
            <span>${tasaCumplimiento}%</span>
          </div>
          <div style="height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${tasaCumplimiento}%; background: linear-gradient(90deg, #10B981, #059669); transition: width 0.5s ease;"></div>
          </div>
        </div>
      </div>
    `;
    } catch (error) {
        console.error('Error al cargar KPIs:', error);
        const container = document.getElementById('kpis-content');
        container.innerHTML = '<p class="text-center text-muted">Error al cargar datos</p>';
    }
}

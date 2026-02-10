// Módulo de Importación de Excel
(function () {
    'use strict';

    window.abrirModalImportar = function (tipo) {
        const title = tipo === 'organizaciones' ? 'Importar Dependencias/Entidades' : 'Importar Herramientas Masivamente';
        const instructions = tipo === 'organizaciones'
            ? 'Sube un Excel con las columnas: Nombre, Tipo (Dependencia/Paraestatal), Siglas, Titular, Decreto.'
            : 'Sube un Excel con: Dependencia, Tipo Herramienta, Link, Fecha, Estatus POE, Link POE, Comentarios.';

        const columns = tipo === 'organizaciones'
            ? ['Nombre', 'Tipo (Dependencia/Paraestatal)', 'Siglas', 'Titular', 'URL Decreto']
            : ['Nombre Dependencia', 'Tipo Herramienta', 'Link Herramienta', 'Fecha (AAAA-MM-DD)', 'Estatus POE', 'Link POE', 'Comentarios'];

        document.getElementById('import-modal-title').textContent = title;
        document.getElementById('import-instructions').textContent = instructions;
        document.getElementById('import-type').value = tipo;
        document.getElementById('import-results').innerHTML = '';
        document.getElementById('import-status').style.display = 'none';
        document.getElementById('btn-import-submit').disabled = false;
        document.getElementById('import-file').value = '';

        const list = document.getElementById('import-columns-list');
        list.innerHTML = columns.map(c => `<li>${c}</li>`).join('');

        // Link de plantilla dinámico
        const btnPlantilla = document.getElementById('btn-descargar-plantilla');
        if (btnPlantilla) {
            btnPlantilla.href = `assets/templates/plantilla_${tipo}.xlsx`;
            btnPlantilla.download = `plantilla_${tipo}.xlsx`;
        }

        window.mostrarModal('modal-importar-excel');
    };

    window.handleImportarExcel = async function (e) {
        e.preventDefault();
        const tipo = document.getElementById('import-type').value;
        const fileInput = document.getElementById('import-file');
        const resultsContainer = document.getElementById('import-results');
        const statusContainer = document.getElementById('import-status');
        const btnSubmit = document.getElementById('btn-import-submit');

        if (!fileInput.files[0]) return;

        const formData = new FormData();
        formData.append('archivo', fileInput.files[0]);

        statusContainer.style.display = 'block';
        resultsContainer.innerHTML = '';
        btnSubmit.disabled = true;

        try {
            const resp = await fetch(`${window.AppUtils.API_URL}/import/${tipo}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.AppUtils.AppState.token}`
                },
                body: formData
            });

            const data = await resp.json();
            statusContainer.style.display = 'none';
            btnSubmit.disabled = false;

            if (resp.ok) {
                let html = `<p class="text-success" style="font-weight:600;">✅ ${data.mensaje}</p>`;
                if (data.alertas && data.alertas.length > 0) {
                    html += '<p class="mt-10 mb-5" style="font-size:0.9rem;">⚠️ Alertas/Omisiones:</p><ul style="font-size:0.8rem; color:var(--rojo-incumplimiento);">';
                    data.alertas.forEach(a => html += `<li>${a}</li>`);
                    html += '</ul>';
                }
                resultsContainer.innerHTML = html;

                // Refrescar datos según el tipo
                if (tipo === 'organizaciones') {
                    if (window.cargarOrganizaciones) window.cargarOrganizaciones();
                } else {
                    if (window.refrescarVistaHerramientas) window.refrescarVistaHerramientas();
                }

                window.AppUtils.mostrarAlerta('Proceso completado', 'success');
            } else {
                resultsContainer.innerHTML = `<p class="text-error">❌ Error: ${data.error || 'Ocurrió un error inesperado'}</p>`;
            }
        } catch (error) {
            console.error(error);
            statusContainer.style.display = 'none';
            btnSubmit.disabled = false;
            resultsContainer.innerHTML = '<p class="text-error">❌ Error de conexión con el servidor</p>';
        }
    };
})();

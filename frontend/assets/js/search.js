// Módulo de Buscador Inteligente (Spotlight)
(function () {
    'use strict';

    const SearchModule = {
        init: function () {
            // Event Listeners Globales
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.abrirBuscador();
                }
                if (e.key === 'Escape') {
                    this.cerrarBuscador();
                }
            });

            // Input del buscador
            const input = document.getElementById('spotlight-input');
            const modal = document.getElementById('modal-search-spotlight');

            if (input) {
                let debounceTimer;
                input.addEventListener('input', (e) => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        this.buscar(e.target.value);
                    }, 300);
                });

                // Navegación con flechas
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                        e.preventDefault(); // Evitar mover el cursor en el input
                        this.navegarResultados(e.key);
                    }
                });
            }

            // Cerrar al hacer clic fuera del contenido
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.cerrarBuscador();
                    }
                });
            }
        },

        abrirBuscador: function () {
            const modal = document.getElementById('modal-search-spotlight');
            const input = document.getElementById('spotlight-input');
            if (modal && input) {
                modal.style.display = 'flex';
                input.value = '';
                input.focus();
                this.renderizarEstadoVacio();
            }
        },

        cerrarBuscador: function () {
            const modal = document.getElementById('modal-search-spotlight');
            if (modal) {
                modal.style.display = 'none';
            }
        },

        buscar: async function (termino) {
            const container = document.getElementById('spotlight-results');

            if (!termino || termino.length < 2) {
                this.renderizarEstadoVacio();
                return;
            }

            container.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';

            try {
                // Agregar parámetro para búsqueda "fuzzy" o más flexible si el backend lo soporta
                const response = await fetch(`${window.AppUtils.API_URL}/search/smart?q=${encodeURIComponent(termino)}`, {
                    headers: { 'Authorization': `Bearer ${window.AppUtils.AppState.token}` }
                });

                if (!response.ok) throw new Error('Error en búsqueda');

                const data = await response.json();
                this.renderizarResultados(data.results);

            } catch (error) {
                console.error(error);
                container.innerHTML = '<div class="text-error" style="text-align:center; padding:20px;">Error al buscar. Intente nuevamente.</div>';
            }
        },

        renderizarEstadoVacio: function () {
            const container = document.getElementById('spotlight-results');
            if (container) {
                container.innerHTML = `
                    <div class="search-empty-state">
                        <p>Escribe para buscar en todo el sistema...</p>
                        <small>Prueba: "Secretaría", "Organigrama", "Expediente 001"</small>
                    </div>
                `;
            }
        },

        renderizarResultados: function (resultados) {
            const container = document.getElementById('spotlight-results');
            container.innerHTML = '';

            if (!resultados || resultados.length === 0) {
                container.innerHTML = '<div class="search-empty-state"><p>No se encontraron resultados.</p></div>';
                return;
            }

            resultados.forEach((item, index) => {
                const el = document.createElement('div');
                el.className = `search-result-item item-type-${item.type.toLowerCase()}`;
                el.dataset.index = index;
                el.onclick = () => this.seleccionar(item);

                let icon = '📄';
                if (item.type === 'ORGANIZACION') icon = '🏢';
                if (item.type === 'HERRAMIENTA') icon = '💼';
                if (item.type === 'EXPEDIENTE') icon = '📁';

                // Badges de estado
                let statusBadge = '';
                if (item.status) {
                    let color = '#ccc';
                    if (item.status === 'VERDE') color = 'var(--verde-cumplimiento)';
                    if (item.status === 'AMARILLO') color = 'var(--amarillo-advertencia)';
                    if (item.status === 'ROJO') color = 'var(--rojo-incumplimiento)';
                    statusBadge = `<span class="result-badge" style="background:${color}20; color:${color}; margin-left: auto;">${item.status}</span>`;
                }

                el.innerHTML = `
                    <div class="result-icon">${icon}</div>
                    <div class="result-content">
                        <div class="result-title">${item.title}</div>
                        <div class="result-subtitle">${item.subtitle || ''}</div>
                    </div>
                    ${statusBadge}
                `;
                container.appendChild(el);
            });

            // Seleccionar el primero por defecto
            const first = container.querySelector('.search-result-item');
            if (first) first.classList.add('selected');
        },

        navegarResultados: function (key) {
            const container = document.getElementById('spotlight-results');
            const items = container.querySelectorAll('.search-result-item');
            if (items.length === 0) return;

            let current = container.querySelector('.search-result-item.selected');
            let index = current ? parseInt(current.dataset.index) : -1;

            if (key === 'ArrowDown') {
                index = index < items.length - 1 ? index + 1 : 0;
            } else if (key === 'ArrowUp') {
                index = index > 0 ? index - 1 : items.length - 1;
            } else if (key === 'Enter') {
                if (current) current.click();
                return;
            }

            items.forEach(i => i.classList.remove('selected'));
            items[index].classList.add('selected');
            items[index].scrollIntoView({ block: 'nearest' });
        },

        seleccionar: function (item) {
            this.cerrarBuscador();

            // Lógica de navegación
            if (item.type === 'ORGANIZACION') {
                window.mostrarVista('organizaciones');
                setTimeout(() => {
                    // Intento simple de filtrar
                    const inputFiltro = document.getElementById('buscar-org-herramientas');
                    if (inputFiltro) {
                        inputFiltro.value = item.title;
                        inputFiltro.dispatchEvent(new Event('input'));
                    }
                }, 500);

            } else if (item.type === 'HERRAMIENTA') {
                // Descargar herramienta
                // window.location.href = `${window.AppUtils.API_URL}/herramientas/${item.id}/descargar?token=${window.AppUtils.AppState.token}`;
                // Mejor usar la función del módulo herramientas si existe
                if (window.HerramientasModule && window.HerramientasModule.getUrlDescarga) {
                    const url = window.HerramientasModule.getUrlDescarga(item.id);
                    window.open(url, '_blank');
                } else {
                    // Fallback
                    const token = localStorage.getItem('token');
                    window.open(`${window.AppUtils.API_URL}/herramientas/${item.id}/descargar?token=${token}`, '_blank');
                }

            } else if (item.type === 'EXPEDIENTE') {
                window.mostrarVista('expedientes');
            }
        }
    };

    window.SearchModule = SearchModule;

    // Inicializar al cargar
    document.addEventListener('DOMContentLoaded', () => {
        SearchModule.init();
    });

})();

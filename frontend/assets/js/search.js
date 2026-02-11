const SearchModule = {
    timer: null,

    init() {
        const input = document.getElementById('smart-search-input');
        const results = document.getElementById('smart-search-results');

        if (!input) return;

        input.addEventListener('input', (e) => {
            clearTimeout(this.timer);
            const query = e.target.value.trim();

            if (query.length < 2) {
                results.style.display = 'none';
                return;
            }

            this.timer = setTimeout(() => this.buscar(query), 300);
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !results.contains(e.target)) {
                results.style.display = 'none';
            }
        });
    },

    async buscar(query) {
        const resultsDiv = document.getElementById('smart-search-results');
        try {
            const response = await fetch(`/api/search/smart?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            this.renderizarResultados(data.results);
        } catch (error) {
            console.error('Error en búsqueda inteligente:', error);
        }
    },

    renderizarResultados(lista) {
        const resultsDiv = document.getElementById('smart-search-results');
        if (!lista || lista.length === 0) {
            resultsDiv.innerHTML = '<div class="search-result-item"><span class="result-title">No se encontraron resultados</span></div>';
            resultsDiv.style.display = 'block';
            return;
        }

        resultsDiv.innerHTML = lista.map(item => `
            <div class="search-result-item" onclick="SearchModule.seleccionar('${item.type}', ${item.id})">
                <span class="result-type">${item.type}</span>
                <span class="result-title">${item.title}</span>
                <span class="result-subtitle">${item.subtitle || ''}</span>
                ${item.status ? `<span class="badge badge-${item.status.toLowerCase()}">${item.status}</span>` : ''}
            </div>
        `).join('');
        resultsDiv.style.display = 'block';
    },

    seleccionar(type, id) {
        document.getElementById('smart-search-results').style.display = 'none';
        document.getElementById('smart-search-input').value = '';

        if (type === 'ORGANIZACION') {
            window.verDetalleDependencia(id);
        } else if (type === 'EXPEDIENTE') {
            window.mostrarVista('expedientes');
            // Podríamos scrollear o filtrar para abrir este específicamente
        } else if (type === 'HERRAMIENTA') {
            // Abrir herramienta
            window.HerramientasModule.descargar(id);
        }
    }
};

window.SearchModule = SearchModule;
SearchModule.init();

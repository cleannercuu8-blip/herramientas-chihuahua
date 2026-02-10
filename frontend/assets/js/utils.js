// Configuración de la API
const API_URL = window.location.origin + '/api';

// Estado global de la aplicación
const AppState = {
    token: localStorage.getItem('token') || null,
    usuario: JSON.parse(localStorage.getItem('usuario')) || null,
    currentView: 'dashboard'
};

// Guardar token y usuario
function guardarSesion(token, usuario) {
    AppState.token = token;
    AppState.usuario = usuario;
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
}

// Cerrar sesión
function cerrarSesion() {
    AppState.token = null;
    AppState.usuario = null;
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/pages/login.html';
}

// Verificar autenticación
function verificarAutenticacion() {
    if (!AppState.token) {
        window.location.href = '/pages/login.html';
        return false;
    }
    return true;
}

// Realizar petición a la API
async function fetchAPI(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(AppState.token && { 'Authorization': `Bearer ${AppState.token}` })
        }
    };

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);

        // Si no está autorizado, redirigir al login
        if (response.status === 401) {
            cerrarSesion();
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en la petición');
        }

        return data;
    } catch (error) {
        console.error('Error en fetchAPI:', error);
        throw error;
    }
}

// Realizar petición con archivo
async function fetchAPIWithFile(endpoint, formData) {
    const config = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AppState.token}`
        },
        body: formData
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);

        if (response.status === 401) {
            cerrarSesion();
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en la petición');
        }

        return data;
    } catch (error) {
        console.error('Error en fetchAPIWithFile:', error);
        throw error;
    }
}

// Mostrar alerta
function mostrarAlerta(mensaje, tipo = 'success') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${tipo}`;
    alert.textContent = mensaje;

    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Formatear fecha
function formatearFecha(fecha) {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Formatear fecha corta
function formatearFechaCorta(fecha) {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX');
}

// Obtener badge de semáforo
function getBadgeSemaforo(estatus) {
    const badges = {
        'VERDE': '<span class="badge badge-verde">✓ Verde</span>',
        'AMARILLO': '<span class="badge badge-amarillo">⚠ Amarillo</span>',
        'ROJO': '<span class="badge badge-rojo">✗ Rojo</span>'
    };
    return badges[estatus] || '<span class="badge">-</span>';
}

// Obtener nombre legible de tipo de herramienta
function getNombreTipoHerramienta(tipo) {
    const nombres = {
        'ORGANIGRAMA': 'Organigrama',
        'REGLAMENTO_INTERIOR': 'Reglamento Interior',
        'ESTATUTO_ORGANICO': 'Estatuto Orgánico',
        'MANUAL_ORGANIZACION': 'Manual de Organización',
        'MANUAL_PROCEDIMIENTOS': 'Manual de Procedimientos',
        'MANUAL_SERVICIOS': 'Manual de Servicios'
    };
    return nombres[tipo] || tipo;
}

// Obtener nombre legible de tipo de organización
function getNombreTipoOrganizacion(tipo) {
    const nombres = {
        'DEPENDENCIA': 'Dependencia',
        'ENTIDAD_PARAESTATAL': 'Entidad Paraestatal'
    };
    return nombres[tipo] || tipo;
}

// Mostrar/ocultar spinner
function mostrarSpinner(show = true) {
    const spinner = document.getElementById('spinner');
    if (spinner) {
        spinner.classList.toggle('hidden', !show);
    }
}

// Descargar archivo
function descargarArchivo(url, nombreArchivo) {
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Exportar funciones globales
window.AppUtils = {
    AppState,
    guardarSesion,
    cerrarSesion,
    verificarAutenticacion,
    fetchAPI,
    fetchAPIWithFile,
    mostrarAlerta,
    formatearFecha,
    formatearFechaCorta,
    getBadgeSemaforo,
    getNombreTipoHerramienta,
    getNombreTipoOrganizacion,
    mostrarSpinner,
    descargarArchivo,
    API_URL
};

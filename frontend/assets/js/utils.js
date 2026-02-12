// Configuración de la API
const API_URL = window.location.origin + '/api';

// Estado global de la aplicación
const AppState = {
    token: sessionStorage.getItem('token') || null,
    usuario: JSON.parse(sessionStorage.getItem('usuario')) || null,
    currentView: 'dashboard'
};

// Guardar token y usuario
function guardarSesion(token, usuario) {
    AppState.token = token;
    AppState.usuario = usuario;
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('usuario', JSON.stringify(usuario));
}

// Cerrar sesión
function cerrarSesion() {
    AppState.token = null;
    AppState.usuario = null;
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
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

        if (!response.ok) {
            // Arreglo inmediato: si no es OK, leer el texto para dar un error descriptivo
            // Esto evita que el sistema se cuelgue si el servidor devuelve HTML (error de Render/Gunicorn)
            const text = await response.text();
            throw new Error(`API error ${response.status}: ${text}`);
        }

        return await response.json();
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

// Formatear fecha (Usar UTC para evitar saltos de día por zona horaria)
function formatearFecha(fecha) {
    if (!fecha) return '-';
    // Ignorar tiempo y zona horaria, tratar como fecha pura
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });
}

// Formatear fecha corta (Usar UTC)
function formatearFechaCorta(fecha) {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', { timeZone: 'UTC' });
}

// Obtener badge de semáforo
function getBadgeSemaforo(estatus) {
    const s = (estatus || '').toUpperCase();
    const badges = {
        'VERDE': '<span class="badge badge-verde">✓ Verde</span>',
        'AMARILLO': '<span class="badge badge-amarillo">⚠ Amarillo</span>',
        'ROJO': '<span class="badge badge-rojo">✗ Rojo</span>'
    };
    return badges[s] || '<span class="badge">-</span>';
}

// Obtener nombre legible de tipo de herramienta
function getNombreTipoHerramienta(tipo) {
    const nombres = {
        'ORGANIGRAMA': 'Organigrama',
        'REGLAMENTO_INTERIOR': 'Reglamento Interior / Estatuto Orgánico',
        'ESTATUTO_ORGANICO': 'Reglamento Interior / Estatuto Orgánico',
        'REGLAMENTO_ESTATUTO': 'Reglamento Interior / Estatuto Orgánico',
        'MANUAL_ORGANIZACION': 'Manual de Organización',
        'MANUAL_PROCEDIMIENTOS': 'Manual de Procedimientos',
        'MANUAL_SERVICIOS': 'Manual de Servicios'
    };
    return nombres[tipo] || tipo;
}

// Obtener nombre legible de tipo de organización
function getNombreTipoOrganizacion(tipo) {
    const nombres = {
        'DEPENDENCIA': 'Dependencia (Centralizada)',
        'ENTIDAD_PARAESTATAL': 'Entidad (Paraestatal)',
        'ORGANISMO_AUTONOMO': 'Organismo Autónomo'
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

// Obtener URL con token de autenticación para descargas/previsualización
function getAuthenticatedUrl(url) {
    if (!AppState.token) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${AppState.token}`;
}

// Descargar archivo
function descargarArchivo(url, nombreArchivo) {
    const authenticatedUrl = getAuthenticatedUrl(url);
    const link = document.createElement('a');
    link.href = authenticatedUrl;
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
    getAuthenticatedUrl,
    API_URL
};

// Módulo de autenticación
const AuthModule = {
    // Login
    async login(email, password) {
        try {
            const data = await window.AppUtils.fetchAPI('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (data && data.success && data.data && data.data.token) {
                window.AppUtils.guardarSesion(data.data.token, data.data.usuario);
                return { success: true, data: data.data };
            }

            return { success: false, error: data.error || 'Credenciales inválidas' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Obtener perfil
    async obtenerPerfil() {
        try {
            const res = await window.AppUtils.fetchAPI('/auth/perfil');
            return { success: true, data: res.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Registrar usuario
    async registrarUsuario(usuario) {
        try {
            const res = await window.AppUtils.fetchAPI('/auth/registrar', {
                method: 'POST',
                body: JSON.stringify(usuario)
            });
            return { success: true, data: res.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Obtener usuario actual del AppUtils
    getUsuario() {
        return window.AppUtils.AppState.usuario;
    },

    // Solicitar recuperación de contraseña
    async solicitarRecuperacion(email) {
        try {
            const res = await window.AppUtils.fetchAPI('/auth/solicitar-recuperacion', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            return { success: true, data: res.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Restablecer contraseña
    async restablecerPassword(email, codigo, nuevoPassword) {
        try {
            const res = await window.AppUtils.fetchAPI('/auth/restablecer-password', {
                method: 'POST',
                body: JSON.stringify({ email, codigo, nuevoPassword })
            });
            return { success: true, data: res.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

window.AuthModule = AuthModule;

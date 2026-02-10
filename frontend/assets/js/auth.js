// Módulo de autenticación
const AuthModule = {
    // Login
    async login(email, password) {
        try {
            const data = await window.AppUtils.fetchAPI('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (data && data.token) {
                window.AppUtils.guardarSesion(data.token, data.usuario);
                return { success: true, data };
            }

            return { success: false, error: 'Credenciales inválidas' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Obtener perfil
    async obtenerPerfil() {
        try {
            const data = await window.AppUtils.fetchAPI('/auth/perfil');
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Registrar usuario
    async registrarUsuario(usuario) {
        try {
            const data = await window.AppUtils.fetchAPI('/auth/registrar', {
                method: 'POST',
                body: JSON.stringify(usuario)
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

window.AuthModule = AuthModule;

// Módulo de Usuarios y Perfil
(function () {
    'use strict';

    // --- MI PERFIL ---

    window.mostrarModalPerfil = function () {
        const usuario = window.AppUtils.AppState.usuario;
        if (!usuario) return;

        document.getElementById('perfil-nombre').textContent = usuario.nombre_completo;
        document.getElementById('perfil-email').textContent = usuario.email;

        const badge = document.getElementById('perfil-rol-badge');
        badge.textContent = usuario.rol;
        badge.className = 'badge ' + (usuario.rol === 'ADMINISTRADOR' ? 'badge-verde' : 'badge-amarillo');

        window.mostrarModal('modal-perfil');
    };

    window.handleCambioPassword = async function (e) {
        e.preventDefault();
        const passwordActual = document.getElementById('pwd-actual').value;
        const nuevoPassword = document.getElementById('pwd-nuevo').value;

        if (!passwordActual || !nuevoPassword) {
            return window.AppUtils.mostrarAlerta('Completa todos los campos', 'error');
        }

        window.AppUtils.mostrarSpinner(true);
        try {
            const resp = await fetch(`${window.AppUtils.API_URL}/auth/cambiar-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.AppUtils.AppState.token}`
                },
                body: JSON.stringify({ passwordActual, nuevoPassword })
            });

            const data = await resp.json();
            if (resp.ok) {
                window.AppUtils.mostrarAlerta(data.mensaje || 'Contraseña actualizada', 'success');
                window.cerrarModal('modal-perfil');
                e.target.reset();
            } else {
                window.AppUtils.mostrarAlerta(data.error || 'Error al cambiar contraseña', 'error');
            }
        } catch (error) {
            console.error(error);
            window.AppUtils.mostrarAlerta('Error de conexión', 'error');
        } finally {
            window.AppUtils.mostrarSpinner(false);
        }
    };

    // --- ADMINISTRACIÓN DE USUARIOS (Solo Admin) ---

    window.cargarUsuariosAdmin = async function () {
        const container = document.getElementById('usuarios-tabla-body');
        if (!container) return;

        container.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner"></div></td></tr>';

        try {
            const resp = await fetch(`${window.AppUtils.API_URL}/auth/usuarios`, {
                headers: { 'Authorization': `Bearer ${window.AppUtils.AppState.token}` }
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error);

            let html = '';
            data.usuarios.forEach(u => {
                const estadoClass = u.activo ? 'active-user' : 'inactive-user';
                html += `
          <tr class="user-row-admin ${estadoClass}">
            <td><strong>${u.nombre_completo}</strong></td>
            <td>${u.email}</td>
            <td>${u.rol}</td>
            <td>${u.activo ? '<span class="badge badge-verde">Activo</span>' : '<span class="badge badge-rojo">Inactivo</span>'}</td>
            <td>
              <div style="display: flex; gap: 5px;">
                <button class="btn btn-primary btn-sm" onclick="window.mostrarModalEditarUsuarioAdmin(${JSON.stringify(u).replace(/"/g, '&quot;')})">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="window.eliminarUsuarioAdmin(${u.id}, '${u.nombre_completo}')">Eliminar</button>
              </div>
            </td>
          </tr>
        `;
            });
            container.innerHTML = html || '<tr><td colspan="5" class="text-center">No hay usuarios registrados</td></tr>';
        } catch (error) {
            console.error(error);
            container.innerHTML = '<tr><td colspan="5" class="text-center text-error">Error al cargar usuarios</td></tr>';
        }
    };

    window.mostrarModalNuevoUsuario = function () {
        document.getElementById('usuario-modal-title').textContent = 'Registrar Nuevo Usuario';
        document.getElementById('form-usuario-admin').reset();
        document.getElementById('admin-user-id').value = '';
        document.getElementById('admin-user-pwd').required = true;
        window.mostrarModal('modal-usuario-admin');
    };

    window.mostrarModalEditarUsuarioAdmin = function (u) {
        document.getElementById('usuario-modal-title').textContent = 'Editar Usuario';
        document.getElementById('admin-user-id').value = u.id;
        document.getElementById('admin-user-nombre').value = u.nombre_completo;
        document.getElementById('admin-user-email').value = u.email;
        document.getElementById('admin-user-rol').value = u.rol;
        document.getElementById('admin-user-activo').value = u.activo;
        document.getElementById('admin-user-pwd').required = false;
        document.getElementById('admin-user-pwd').value = '';
        window.mostrarModal('modal-usuario-admin');
    };

    window.handleGuardarUsuario = async function (e) {
        e.preventDefault();
        const id = document.getElementById('admin-user-id').value;
        const formData = {
            nombre_completo: document.getElementById('admin-user-nombre').value,
            email: document.getElementById('admin-user-email').value,
            rol: document.getElementById('admin-user-rol').value,
            activo: document.getElementById('admin-user-activo').value,
            password: document.getElementById('admin-user-pwd').value
        };

        const isEdit = id && id !== '';
        const url = isEdit ? `${window.AppUtils.API_URL}/auth/usuarios/${id}` : `${window.AppUtils.API_URL}/auth/registrar`;
        const method = isEdit ? 'PUT' : 'POST';

        window.AppUtils.mostrarSpinner(true);
        try {
            const resp = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.AppUtils.AppState.token}`
                },
                body: JSON.stringify(formData)
            });

            const res = await resp.json();
            if (resp.ok) {
                window.AppUtils.mostrarAlerta(res.mensaje || 'Usuario guardado', 'success');
                window.cerrarModal('modal-usuario-admin');
                window.cargarUsuariosAdmin();
            } else {
                window.AppUtils.mostrarAlerta(res.error || 'Error al guardar', 'error');
            }
        } catch (error) {
            console.error(error);
            window.AppUtils.mostrarAlerta('Error de conexión', 'error');
        } finally {
            window.AppUtils.mostrarSpinner(false);
        }
    };

    window.eliminarUsuarioAdmin = async function (id, nombre) {
        if (!confirm(`¿Estás seguro de eliminar al usuario ${nombre}? esta acción no se puede deshacer.`)) return;

        window.AppUtils.mostrarSpinner(true);
        try {
            const resp = await fetch(`${window.AppUtils.API_URL}/auth/usuarios/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.AppUtils.AppState.token}`
                }
            });

            const res = await resp.json();
            if (resp.ok) {
                window.AppUtils.mostrarAlerta(res.mensaje || 'Usuario eliminado', 'success');
                window.cargarUsuariosAdmin();
            } else {
                window.AppUtils.mostrarAlerta(res.error || 'Error al eliminar', 'error');
            }
        } catch (error) {
            console.error(error);
            window.AppUtils.mostrarAlerta('Error de conexión', 'error');
        } finally {
            window.AppUtils.mostrarSpinner(false);
        }
    };

    // Re-mapear el botón de "Nuevo Usuario" si existe
    window.addEventListener('load', () => {
        const btnNuevo = document.querySelector('button[onclick="mostrarModal(\'modal-nuevo-usuario\')"]');
        if (btnNuevo) {
            btnNuevo.setAttribute('onclick', 'window.mostrarModalNuevoUsuario()');
        }
    });

})();

# Sistema de Registro de Herramientas Organizacionales
## Gobierno del Estado de Chihuahua

Sistema web para gestionar y monitorear herramientas organizacionales (organigramas, reglamentos, estatutos, manuales) de dependencias y entidades paraestatales del Gobierno de Chihuahua.

## 🚀 Características

- ✅ Sistema de semáforo para evaluar cumplimiento normativo (basado en 2022)
- ✅ Gestión de organizaciones (Dependencias y Entidades Paraestatales)
- ✅ Registro de 6 tipos de herramientas organizacionales
- ✅ Control de acceso basado en roles (Administrador, Capturista, Consultor)
- ✅ Carga y descarga de archivos (PDF, Word, Excel)
- ✅ Exportación de reportes a Excel con colores institucionales
- ✅ Historial completo de cambios
- ✅ Alertas de herramientas próximas a vencer
- ✅ Diseño con colores institucionales de Chihuahua

## 📋 Requisitos

- Node.js 14 o superior
- npm o yarn

## 🔧 Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Inicializar la base de datos:**
```bash
npm run init-db
```

Esto creará las tablas necesarias y un usuario administrador por defecto:
- Email: `admin@chihuahua.gob.mx`
- Contraseña: `admin123`

⚠️ **IMPORTANTE:** Cambia esta contraseña después del primer login.

3. **Iniciar el servidor:**
```bash
npm start
```

Para desarrollo con auto-reload:
```bash
npm run dev
```

4. **Acceder a la aplicación:**

Abre tu navegador en: `http://localhost:3000`

## 👥 Roles de Usuario

### Administrador
- Gestión completa de usuarios
- CRUD de organizaciones y herramientas
- Generación y exportación de reportes
- Acceso a logs de auditoría

### Capturista
- CRUD de herramientas
- Visualización de organizaciones
- Generación de reportes básicos

### Consultor
- Solo lectura
- Visualización de herramientas y organizaciones
- Generación de reportes
- Exportación de datos

## 🎨 Tipos de Herramientas

1. **Organigrama**
2. **Reglamento Interior** (para Dependencias)
3. **Estatuto Orgánico** (para Entidades Paraestatales)
4. **Manual de Organización**
5. **Manual de Procedimientos**
6. **Manual de Servicios**

## 🚦 Sistema de Semáforo

### 🟢 Verde - Cumplimiento Total
- Todas las herramientas actualizadas desde 2022
- Reglamento/Estatuto publicado en POE
- Organigrama vigente

### 🟡 Amarillo - Cumplimiento Parcial
- Algunas herramientas requieren actualización
- Documentos con más de 2 años sin actualizar

### 🔴 Rojo - Incumplimiento
- Herramientas anteriores a 2022
- Sin publicación en Periódico Oficial del Estado
- Falta organigrama o reglamento/estatuto

## 📊 Reportes Disponibles

1. **Inventario Completo** - Todas las organizaciones y sus herramientas
2. **Reporte de Semáforo** - Estatus de cumplimiento por organización
3. **Herramientas Próximas a Vencer** - Documentos que requieren actualización

Todos los reportes se exportan a Excel con formato y colores institucionales.

## 🗂️ Estructura del Proyecto

```
herramientas-organizacionales-chihuahua/
├── backend/
│   ├── config/          # Configuración de base de datos
│   ├── controllers/     # Lógica de negocio
│   ├── middleware/      # Autenticación y carga de archivos
│   ├── models/          # Modelos de datos
│   ├── routes/          # Rutas de API
│   ├── utils/           # Utilidades (semáforo, exportación)
│   ├── uploads/         # Archivos subidos
│   └── server.js        # Servidor Express
├── frontend/
│   ├── assets/
│   │   ├── css/         # Estilos
│   │   └── js/          # JavaScript
│   ├── pages/           # Páginas HTML
│   └── index.html       # Dashboard principal
└── package.json
```

## 🔐 Seguridad

- Autenticación JWT con expiración de 8 horas
- Contraseñas hasheadas con bcrypt
- Control de acceso basado en roles
- Validación de tipos de archivo
- Límite de tamaño de archivo (10MB)
- Auditoría completa de cambios

## 🌐 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/perfil` - Obtener perfil
- `POST /api/auth/registrar` - Registrar usuario

### Organizaciones
- `GET /api/organizaciones` - Listar organizaciones
- `GET /api/organizaciones/:id` - Obtener organización
- `POST /api/organizaciones` - Crear organización
- `PUT /api/organizaciones/:id` - Actualizar organización
- `DELETE /api/organizaciones/:id` - Eliminar organización
- `GET /api/organizaciones/estadisticas` - Estadísticas de semáforo

### Herramientas
- `GET /api/herramientas` - Listar herramientas
- `GET /api/herramientas/:id` - Obtener herramienta
- `POST /api/herramientas` - Crear herramienta (con archivo)
- `PUT /api/herramientas/:id` - Actualizar herramienta
- `DELETE /api/herramientas/:id` - Eliminar herramienta
- `GET /api/herramientas/:id/descargar` - Descargar archivo
- `GET /api/herramientas/proximas-vencer` - Herramientas próximas a vencer

### Reportes
- `GET /api/reportes/exportar/inventario` - Exportar inventario (Excel)
- `GET /api/reportes/exportar/semaforo` - Exportar semáforo (Excel)
- `GET /api/reportes/exportar/proximas-vencer` - Exportar próximas a vencer (Excel)
- `GET /api/reportes/historial` - Obtener historial de cambios

## 📝 Licencia

Gobierno del Estado de Chihuahua - 2024

## 🆘 Soporte

Para soporte técnico, contactar al administrador del sistema.

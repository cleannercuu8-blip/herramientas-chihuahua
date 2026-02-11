const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ImportController = require('../controllers/importController');

// Asegurar que existe la carpeta de uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const { verificarToken, verificarRol } = require('../middleware/auth');

// Configuración de Multer para archivos temporales de Excel
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'import-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
        }
    }
});

// Rutas (Administradores y Capturistas)
router.post('/organizaciones', verificarToken, verificarRol('ADMINISTRADOR', 'CAPTURISTA'), upload.single('archivo'), ImportController.importarOrganizaciones);
router.post('/herramientas', verificarToken, verificarRol('ADMINISTRADOR', 'CAPTURISTA'), upload.single('archivo'), ImportController.importarHerramientas);

module.exports = router;

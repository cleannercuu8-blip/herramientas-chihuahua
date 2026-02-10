const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const templateDir = path.join(__dirname, '../../frontend/assets/templates');

if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
}

async function generateTemplates() {
    // 1. Plantilla Organizaciones
    const wbOrg = new ExcelJS.Workbook();
    const sheetOrg = wbOrg.addWorksheet('Organizaciones');
    sheetOrg.columns = [
        { header: 'Dependencia/Entidad', key: 'nombre', width: 40 },
        { header: 'Tipo', key: 'tipo', width: 25 },
        { header: 'Siglas', key: 'siglas', width: 15 },
        { header: 'Titular', key: 'titular', width: 30 },
        { header: 'Decreto de Creación', key: 'decreto', width: 40 }
    ];

    // Ejemplo
    sheetOrg.addRow(['Secretaría de Hacienda', 'DEPENDENCIA', 'SH', 'Mtro. José Granillo Vázquez', 'Decreto 123...']);
    sheetOrg.addRow(['DIF Estatal', 'ENTIDAD_PARAESTATAL', 'DIF', 'Lic. María Eugenia Galván', 'Decreto 456...']);

    await wbOrg.xlsx.writeFile(path.join(templateDir, 'plantilla_organizaciones.xlsx'));
    console.log('✅ Plantilla organizaciones generada');

    // 2. Plantilla Herramientas
    const wbTool = new ExcelJS.Workbook();
    const sheetTool = wbTool.addWorksheet('Herramientas');
    sheetTool.columns = [
        { header: 'Dependencia Name', key: 'org', width: 40 },
        { header: 'Tipo Herramienta', key: 'tipo', width: 30 },
        { header: 'Link', key: 'link', width: 50 },
        { header: 'Fecha Emisión (YYYY-MM-DD)', key: 'fecha', width: 25 },
        { header: 'Estatus POE', key: 'estatus', width: 20 },
        { header: 'Link POE', key: 'linkPoe', width: 50 },
        { header: 'Comentarios', key: 'comentarios', width: 40 }
    ];

    // Ejemplo
    sheetTool.addRow([
        'Secretaría de Hacienda',
        'REGLAMENTO INTERIOR',
        'https://ejemplo.com/reglamento',
        '2024-01-01',
        'PUBLICADO',
        'https://periodico-oficial.com/123',
        'Carga inicial de prueba'
    ]);

    await wbTool.xlsx.writeFile(path.join(templateDir, 'plantilla_herramientas.xlsx'));
    console.log('✅ Plantilla herramientas generada');
}

generateTemplates().catch(console.error);

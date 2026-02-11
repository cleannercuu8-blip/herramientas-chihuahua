const SemaforoService = require('../utils/semaforo');

async function testLogic() {
    console.log('--- Testing Semaforo Logic ---');

    const mockOrg = { fecha_emision: '2023-01-01' };
    const mockOldOrg = { fecha_emision: '2020-01-01' };

    console.log('1. Evaluating Organigrama:');
    console.log('   2023:', SemaforoService.evaluarFecha({ fecha_emision: '2023-01-01' })); // VERDE
    console.log('   2020:', SemaforoService.evaluarFecha({ fecha_emision: '2020-01-01' })); // AMARILLO
    console.log('   2015:', SemaforoService.evaluarFecha({ fecha_emision: '2015-01-01' })); // ROJO
    console.log('   Missing:', SemaforoService.evaluarFecha(null)); // ROJO

    console.log('\n2. Evaluating Reglamento (RI/EO):');
    console.log('   2023 (Any Org):', SemaforoService.evaluarReglamento({ fecha_emision: '2023-01-01' }, mockOrg)); // VERDE
    console.log('   2021 (Reg > Org 2020):', SemaforoService.evaluarReglamento({ fecha_emision: '2021-01-01' }, mockOldOrg)); // AMARILLO
    console.log('   2021 (Reg < Org 2023):', SemaforoService.evaluarReglamento({ fecha_emision: '2021-01-01' }, mockOrg)); // NARANJA
    console.log('   2015 (Any Org):', SemaforoService.evaluarReglamento({ fecha_emision: '2015-01-01' }, mockOrg)); // ROJO

    process.exit(0);
}

testLogic();

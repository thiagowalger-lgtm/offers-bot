const { runAutoScraper } = require('./src/services/sources/amazonSource');

async function testScraper() {
  console.log('Iniciando teste do raspador da Amazon...');
  try {
    const validCount = await runAutoScraper();
    console.log(`\n✅ Raspador concluído com sucesso! Encontrou ${validCount} produtos válidos.`);
  } catch (err) {
    console.error('\n❌ Erro crítico no raspador:', err.message);
  }
}

testScraper();

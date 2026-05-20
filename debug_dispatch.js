require('dotenv').config();
const { runAggregator } = require('./src/services/offerAggregator');
const { dispatchNextRound, queues } = require('./src/jobs/offerJob');
const { runWhatsAppWorker } = require('./src/jobs/whatsappJob');
const { getStatus } = require('./src/services/whatsappService');
const db = require('./src/database/database');

async function debug() {
  console.log('=== INICIANDO DEPURADOR DE DISPAROS ===\n');
  console.log('Status do WhatsApp:', getStatus());

  // 1. Forçar preenchimento das gavetas via aggregator
  console.log('\n--- 1. Enchendo as gavetas ---');
  await runAggregator();

  // Mostrar estado das gavetas na RAM
  console.log('\n--- 2. Estado das gavetas na RAM ---');
  for (const [niche, queue] of Object.entries(queues)) {
    console.log(`Gaveta ${niche}: ${queue.length} itens`);
    if (queue.length > 0) {
      console.log(`  -> Primeiro item: ${queue[0].name.substring(0, 60)} (${queue[0].affiliateLink})`);
    }
  }

  // 3. Forçar dispatchNextRound
  console.log('\n--- 3. Forçando rodada de disparos (dispatchNextRound) ---');
  try {
    await dispatchNextRound();
  } catch (err) {
    console.error('Erro ao rodar dispatchNextRound:', err);
  }

  // 4. Verificar se inseriu algo na fila do WhatsApp
  console.log('\n--- 4. Verificando fila do WhatsApp no SQLite ---');
  try {
    const queue = await db.getQuery("SELECT * FROM whatsapp_queue");
    console.log(`Total na fila do WhatsApp: ${queue.length} registros`);
    console.table(queue);
  } catch (err) {
    console.error('Erro ao verificar fila do WhatsApp:', err.message);
  }

  // 5. Forçar WhatsApp Worker
  console.log('\n--- 5. Forçando execução do WhatsApp Worker ---');
  try {
    await runWhatsAppWorker();
  } catch (err) {
    console.error('Erro ao rodar runWhatsAppWorker:', err);
  }
}

// Pequeno delay para garantir conexão do banco se houver
setTimeout(debug, 1000);

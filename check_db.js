const db = require('./src/database/database');

async function checkDb() {
  try {
    console.log('=== VERIFICANDO CONTEÚDO DO BANCO DE DADOS ===\n');
    
    // Tabelas no banco
    const tables = await db.getQuery("SELECT name FROM sqlite_master WHERE type='table'");
    for (const table of tables) {
      console.log(`\n--- Schema da tabela ${table.name} ---`);
      const info = await db.getQuery(`PRAGMA table_info(${table.name})`);
      console.table(info);
    }
    
    // Grupos cadastrados
    const groups = await db.getQuery("SELECT * FROM groups");
    console.log(`\n--- Grupos cadastrados (${groups.length}) ---`);
    console.table(groups);

    // Fila do WhatsApp
    const whatsappQueue = await db.getQuery("SELECT * FROM whatsapp_queue LIMIT 10");
    console.log(`\n--- Fila do WhatsApp (${whatsappQueue.length} registros) ---`);
    console.table(whatsappQueue);

    // Últimos produtos enviados
    const sentProducts = await db.getQuery("SELECT * FROM sent_products ORDER BY id DESC LIMIT 10");
    console.log(`\n--- Últimos 10 produtos enviados ---`);
    console.table(sentProducts);
    
  } catch (err) {
    console.error('Erro ao verificar banco:', err.message);
  }
}

checkDb();

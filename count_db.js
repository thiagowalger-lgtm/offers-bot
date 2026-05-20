const db = require('./src/database/database');

async function countRows() {
  try {
    const sentCount = await db.getQuery("SELECT COUNT(*) as count FROM sent_products");
    const groupCount = await db.getQuery("SELECT COUNT(*) as count FROM groups");
    const queueCount = await db.getQuery("SELECT COUNT(*) as count FROM whatsapp_queue");
    
    console.log('=== COUNT DOS REGISTROS ===');
    console.log('Total em sent_products:', sentCount[0].count);
    console.log('Total em groups:', groupCount[0].count);
    console.log('Total em whatsapp_queue:', queueCount[0].count);
    
    const pendingQueueCount = await db.getQuery("SELECT COUNT(*) as count FROM whatsapp_queue WHERE status = 'pending'");
    console.log('Total pendente na whatsapp_queue:', pendingQueueCount[0].count);
  } catch (err) {
    console.error('Erro ao contar registros:', err.message);
  }
}

countRows();

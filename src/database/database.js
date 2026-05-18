const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');
if (!path.isAbsolute(dbPath)) {
  dbPath = path.resolve(__dirname, '../../', dbPath);
}
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Tabela para evitar envios repetidos
    db.run(`CREATE TABLE IF NOT EXISTS sent_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      affiliate_link TEXT NOT NULL UNIQUE,
      niche TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de canais/grupos de destino
    db.run(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      niche TEXT NOT NULL,
      platform TEXT NOT NULL, -- 'telegram' ou 'whatsapp'
      target_id TEXT NOT NULL -- ID do canal no Telegram ou nome do grupo no WhatsApp
    )`);

    // Tabela para fila do WhatsApp
    db.run(`CREATE TABLE IF NOT EXISTS whatsapp_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT NOT NULL,
      message TEXT NOT NULL,
      niche TEXT NOT NULL,
      image_url TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'sent'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Semeador automático de grupos padrão (Self-Healing Bootstrapper)
    db.get("SELECT COUNT(*) as count FROM groups", (err, row) => {
      if (err) return;
      if (row && row.count === 0) {
        console.log('[SQLite Seeder] 🌱 Semeando canais e grupos padrão no banco de dados...');
        const stmt = db.prepare("INSERT INTO groups (niche, platform, target_id) VALUES (?, ?, ?)");
        
        // Canais do Telegram
        stmt.run('Cozinha', 'telegram', '@garimpodigitalprimehub');
        stmt.run('Beleza feminina', 'telegram', '@ofertasvaultbrasil247');
        stmt.run('Eletrônicos', 'telegram', '@primeachadosxbrasil');
        stmt.run('Gamer', 'telegram', '@descontosecretoshubbr');
        stmt.run('Pet', 'telegram', '@garimpoeliteoficialbr');
        stmt.run('Leitura', 'telegram', '@ofertasquanticasprime');
        stmt.run('Academia_Fitness', 'telegram', '@achadosblackvaultbr');
        stmt.run('Mobile_Games', 'telegram', '@primeimpulsodealsbr');
        
        // Grupos do WhatsApp
        stmt.run('Gamer', 'whatsapp', '120363408801824800@g.us');
        stmt.run('Cozinha', 'whatsapp', '120363427235389022@g.us');
        stmt.run('Eletrônicos', 'whatsapp', '120363407495964635@g.us');
        stmt.run('Beleza feminina', 'whatsapp', '120363427802091162@g.us');
        stmt.run('Pet', 'whatsapp', '120363410226131492@g.us');
        stmt.run('Leitura', 'whatsapp', '120363426209729628@g.us');
        stmt.run('Academia_Fitness', 'whatsapp', '120363426157432603@g.us');
        stmt.run('Mobile_Games', 'whatsapp', '120363427376215727@g.us');
        
        stmt.finalize();
        console.log('[SQLite Seeder] ✅ Canais e grupos padrão semeados com sucesso absoluto.');
      }
    });
  });
}

function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  runQuery,
  getQuery
};

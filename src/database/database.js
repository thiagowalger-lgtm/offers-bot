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

const { normalizeProductIdentity } = require('../utils/normalization');

async function initDb() {
  try {
    // 1. Criar tabelas se não existirem
    await runQuery(`CREATE TABLE IF NOT EXISTS sent_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      affiliate_link TEXT NOT NULL UNIQUE,
      niche TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      niche TEXT NOT NULL,
      platform TEXT NOT NULL, -- 'telegram' ou 'whatsapp'
      target_id TEXT NOT NULL -- ID do canal no Telegram ou nome do grupo no WhatsApp
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS whatsapp_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT NOT NULL,
      message TEXT NOT NULL,
      niche TEXT NOT NULL,
      image_url TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'sent'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Migração de colunas
    try { await runQuery('ALTER TABLE sent_products ADD COLUMN asin TEXT'); } catch (e) {}
    try { await runQuery('ALTER TABLE sent_products ADD COLUMN title_hash TEXT'); } catch (e) {}
    try { await runQuery('ALTER TABLE whatsapp_queue ADD COLUMN retries INTEGER DEFAULT 0'); } catch (e) {}

    // 3. Executa o backfill de dados antigos antes de criar os índices únicos
    const rows = await getQuery('SELECT id, name, affiliate_link, niche FROM sent_products WHERE asin IS NULL OR title_hash IS NULL');
    if (rows && rows.length > 0) {
      console.log(`[SQLite Migrações] 🔄 Realizando preenchimento retroativo (backfill) de ${rows.length} ofertas antigas...`);
      for (const row of rows) {
        const { asin, titleHash } = normalizeProductIdentity(row.name, row.affiliate_link);
        try {
          await runQuery(
            'UPDATE sent_products SET asin = ?, title_hash = ? WHERE id = ?',
            [asin, titleHash, row.id]
          );
        } catch (updateErr) {
          if (updateErr.message.includes('UNIQUE constraint failed')) {
            // Se falhou por UNIQUE constraint, é porque já existe um registro idêntico. Removemos o duplicado.
            await runQuery('DELETE FROM sent_products WHERE id = ?', [row.id]);
            console.log(`[SQLite Migrações] 🗑️ Removida duplicata do histórico durante backfill: "${row.name.substring(0, 30)}..."`);
          } else {
            console.error('[SQLite Migrações] Erro no backfill do ID', row.id, ':', updateErr.message);
          }
        }
      }
      console.log('[SQLite Migrações] ✅ Backfill concluído.');
    }

    // 4. Remove duplicatas do histórico para evitar conflito de índice único composto
    try {
      await runQuery(`
        DELETE FROM sent_products 
        WHERE id NOT IN (
          SELECT MIN(id) 
          FROM sent_products 
          GROUP BY COALESCE(asin, title_hash, name), niche
        )
      `);
    } catch (e) {}

    // 5. Remove índices globais antigos obsoletos e cria os novos índices compostos
    try { await runQuery('DROP INDEX IF EXISTS idx_sent_products_asin'); } catch (e) {}
    try { await runQuery('DROP INDEX IF EXISTS idx_sent_products_title_hash'); } catch (e) {}
    try { await runQuery('CREATE UNIQUE INDEX IF NOT EXISTS idx_sent_products_asin_niche ON sent_products(asin, niche)'); } catch (e) {}
    try { await runQuery('CREATE UNIQUE INDEX IF NOT EXISTS idx_sent_products_title_hash_niche ON sent_products(title_hash, niche)'); } catch (e) {}
    try { await runQuery('CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_niche_platform ON groups(niche, platform)'); } catch (e) {}

    // 6. Semeador de canais Telegram e WhatsApp usando INSERT OR IGNORE
    console.log('[SQLite Seeder] 🌱 Verificando e semeando canais/grupos padrão no banco de dados...');
    const defaultGroups = [
      // Telegram
      { niche: 'Cozinha', platform: 'telegram', target_id: '@garimpodigitalprimehub' },
      { niche: 'Beleza feminina', platform: 'telegram', target_id: '@ofertasvaultbrasil247' },
      { niche: 'Eletrônicos', platform: 'telegram', target_id: '@primeachadosxbrasil' },
      { niche: 'Gamer', platform: 'telegram', target_id: '@descontosecretoshubbr' },
      { niche: 'Pet', platform: 'telegram', target_id: '@garimpoeliteoficialbr' },
      { niche: 'Leitura', platform: 'telegram', target_id: '@ofertasquanticasprime' },
      { niche: 'Academia_Fitness', platform: 'telegram', target_id: '@achadosblackvaultbr' },
      { niche: 'Mobile_Games', platform: 'telegram', target_id: '@primeimpulsodealsbr' },
      // WhatsApp
      { niche: 'Gamer', platform: 'whatsapp', target_id: '120363408801824800@g.us' },
      { niche: 'Cozinha', platform: 'whatsapp', target_id: '120363427235389022@g.us' },
      { niche: 'Eletrônicos', platform: 'whatsapp', target_id: '120363407495964635@g.us' },
      { niche: 'Beleza feminina', platform: 'whatsapp', target_id: '120363427802091162@g.us' },
      { niche: 'Pet', platform: 'whatsapp', target_id: '120363410226131492@g.us' },
      { niche: 'Leitura', platform: 'whatsapp', target_id: '120363426209729628@g.us' },
      { niche: 'Academia_Fitness', platform: 'whatsapp', target_id: '120363426157432603@g.us' },
      { niche: 'Mobile_Games', platform: 'whatsapp', target_id: '120363427376215727@g.us' }
    ];

    for (const g of defaultGroups) {
      await runQuery('INSERT OR IGNORE INTO groups (niche, platform, target_id) VALUES (?, ?, ?)', [g.niche, g.platform, g.target_id]);
    }
    console.log('[SQLite Seeder] ✅ Seeding concluído.');
  } catch (error) {
    console.error('[SQLite Migrações] Erro crítico ao inicializar banco de dados:', error.message);
  }
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

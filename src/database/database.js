const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');
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

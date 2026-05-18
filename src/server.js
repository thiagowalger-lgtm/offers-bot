const express = require('express');
const cors = require('cors');
const db = require('./database/database');
const { queueProduct, runJobs } = require('./jobs/offerJob');
const { getPendingWhatsAppMessages, markWhatsAppMessageAsSent } = require('./services/whatsappQueueService');
const { scrapeLink } = require('./services/scraperService');

const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /offers - Receber oferta manualmente
app.post('/offers', (req, res) => {
  const product = req.body;
  
  if (queueProduct(product)) {
    res.status(202).json({ message: 'Oferta adicionada à fila de processamento.' });
  } else {
    res.status(400).json({ error: 'Dados da oferta inválidos.' });
  }
});

// POST /quick-offer - Receber apenas o link e raspar os dados
app.post('/quick-offer', async (req, res) => {
  const { link } = req.body;
  
  if (!link) {
    return res.status(400).json({ error: 'Link é obrigatório.' });
  }
  
  try {
    const product = await scrapeLink(link);
    
    if (queueProduct(product)) {
      res.status(202).json({ 
        message: 'Oferta extraída e adicionada à fila.',
        product: product 
      });
    } else {
      res.status(400).json({ error: 'Falha ao validar os dados extraídos.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /offers - Listar produtos enviados
app.get('/offers', async (req, res) => {
  try {
    const products = await db.getQuery('SELECT * FROM sent_products ORDER BY sent_at DESC LIMIT 50');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ofertas.' });
  }
});

// GET /groups - Listar grupos
app.get('/groups', async (req, res) => {
  try {
    const groups = await db.getQuery('SELECT * FROM groups');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar grupos.' });
  }
});

// POST /groups - Cadastrar grupo
app.post('/groups', async (req, res) => {
  const { niche, platform, target_id } = req.body;
  
  if (!niche || !platform || !target_id) {
    return res.status(400).json({ error: 'niche, platform e target_id são obrigatórios.' });
  }
  
  if (!['telegram', 'whatsapp'].includes(platform)) {
    return res.status(400).json({ error: 'Platform deve ser telegram ou whatsapp.' });
  }
  
  try {
    await db.runQuery(
      'INSERT INTO groups (niche, platform, target_id) VALUES (?, ?, ?)',
      [niche, platform, target_id]
    );
    res.status(201).json({ message: 'Grupo cadastrado com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar grupo.' });
  }
});

// POST /run-now - Rodar job manualmente lendo de JSON/CSV
app.post('/run-now', (req, res) => {
  runJobs();
  res.json({ message: 'Processamento de arquivos (JSON/CSV) iniciado em background.' });
});

// GET /whatsapp-queue - Fila de WhatsApp
app.get('/whatsapp-queue', async (req, res) => {
  try {
    const messages = await getPendingWhatsAppMessages();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar fila do WhatsApp.' });
  }
});

// POST /mark-whatsapp-sent - Marcar msg WhatsApp como enviada
app.post('/mark-whatsapp-sent', async (req, res) => {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'ID é obrigatório.' });
  }
  
  try {
    const success = await markWhatsAppMessageAsSent(id);
    if (success) {
      res.json({ message: `Mensagem ${id} marcada como enviada.` });
    } else {
      res.status(500).json({ error: 'Erro ao atualizar mensagem.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = app;

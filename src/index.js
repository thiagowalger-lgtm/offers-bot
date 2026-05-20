require('dotenv').config();
const app = require('./server');
const cron = require('node-cron');
const { runJobs, dispatchNextRound } = require('./jobs/offerJob');
const { runAggregator } = require('./services/offerAggregator');
const { startWhatsApp, getStatus, getQrCode, listGroups } = require('./services/whatsappService');
const { runWhatsAppWorker } = require('./jobs/whatsappJob');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;

// ─── Rotas da API do WhatsApp ─────────────────────────────────────────────────

// Status da conexão do WhatsApp
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ status: getStatus(), qr: getQrCode() });
});

// QR Code em formato de imagem para escanear pelo navegador
app.get('/api/whatsapp/qr', (req, res) => {
  const qr = getQrCode();
  if (!qr) {
    const status = getStatus();
    if (status === 'connected') {
      return res.send('<h2 style="font-family:sans-serif;color:green">✅ WhatsApp já está conectado!</h2>');
    }
    return res.send('<h2 style="font-family:sans-serif;color:orange">⏳ Aguardando QR Code... Recarregue a página em alguns segundos.</h2>');
  }
  res.send(`
    <html><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#111;color:#fff">
      <h2>📱 Escaneie com seu WhatsApp</h2>
      <img src="${qr}" style="width:300px;border-radius:12px;border:4px solid #25D366"/>
      <p style="color:#aaa">Abra o WhatsApp > Menu > Aparelhos Conectados > Conectar um aparelho</p>
      <script>setTimeout(()=>location.reload(), 20000)</script>
    </body></html>
  `);
});

// Lista os grupos (após conectado) e retorna JSON
app.get('/api/whatsapp/groups', async (req, res) => {
  if (getStatus() !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado ainda.' });
  }
  await listGroups();
  res.json({ message: 'Lista de grupos impressa no terminal do servidor.' });
});

// ─── Inicialização do Servidor ─────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  
  // Abrir o painel no navegador automaticamente (Windows)
  exec(`start http://localhost:${PORT}`);
  
  // Agendamento opcional para checar arquivos em horários específicos
  cron.schedule('0 9,18 * * *', () => {
    console.log('Executando cronjob diário de leitura de ofertas locais...');
    runJobs();
  });
  
  // Agendamento do Disparo a cada 1 minuto (Telegram e fila WhatsApp)
  cron.schedule('* * * * *', async () => {
    await dispatchNextRound();
  });
  
  // Agendamento do Agregador (Amazon + Fallbacks): Roda a cada 3 minutos para manter as gavetas cheias
  cron.schedule('*/3 * * * *', () => {
    console.log('Executando orquestrador de garimpo...');
    runAggregator();
  });

  // Worker do WhatsApp: processa a fila a cada 1 minuto
  cron.schedule('* * * * *', async () => {
    await runWhatsAppWorker();
  });
  
  console.log('Sistema inicializado e aguardando ofertas.');
  
  // Executar imediatamente na inicialização para encher as gavetas e disparar os primeiros envios
  console.log('Iniciando a primeira orquestração para encher as gavetas imediatamente...');
  (async () => {
    try {
      await runAggregator();
      console.log('[Startup] Gavetas abastecidas. Forçando primeiro envio imediato para Telegram e WhatsApp...');
      await dispatchNextRound();
      await runWhatsAppWorker();
    } catch (err) {
      console.error('[Startup] Erro durante a execução inicial:', err.message);
    }
  })();

  // Iniciar o WhatsApp (gera QR Code no terminal e em http://localhost:3000/api/whatsapp/qr)
  console.log('[WhatsApp] Iniciando conexão... Acesse http://localhost:3000/api/whatsapp/qr para escanear o QR Code.');
  startWhatsApp().catch(err => console.error('[WhatsApp] Erro ao iniciar:', err.message));
});


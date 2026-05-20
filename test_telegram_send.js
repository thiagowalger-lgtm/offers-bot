const axios = require('axios');
require('dotenv').config();

async function testSend() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = '@garimpodigitalprimehub'; // Test Cozinha channel
  console.log(`Tentando enviar mensagem teste para o canal ${channel} usando o bot...`);
  
  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: channel,
      text: '🤖 Teste de envio de oferta pelo Bot.'
    });
    console.log('✅ Mensagem enviada com sucesso para o Telegram!', res.data);
  } catch (err) {
    console.error('❌ Falha ao enviar mensagem para o Telegram:', err.response ? err.response.data : err.message);
  }
}

testSend();

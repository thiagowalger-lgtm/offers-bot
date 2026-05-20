const axios = require('axios');
require('dotenv').config();

async function testTelegramToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  console.log('Testando token:', token);
  if (!token) {
    console.log('TELEGRAM_BOT_TOKEN não está definido no arquivo .env');
    return;
  }

  try {
    const res = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    console.log('✅ Token Telegram válido!', res.data.result);
  } catch (err) {
    console.error('❌ Falha ao testar token Telegram:', err.response ? err.response.data : err.message);
  }
}

testTelegramToken();

const TelegramBot = require('node-telegram-bot-api');
const db = require('../database/database');

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

if (token && token !== 'seu_token_aqui') {
  bot = new TelegramBot(token, { 
    polling: false,
    request: {
      timeout: 10000 // 10 segundos de limite para evitar travamentos de rede
    }
  });
} else {
  console.warn('TELEGRAM_BOT_TOKEN não configurado ou padrão. O envio para o Telegram rodará em modo de simulação.');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Converte formatação WhatsApp (*bold*, ~strikethrough~, _italic_) para HTML do Telegram.
 */
function convertWhatsappToTelegramHtml(text) {
  if (!text) return '';
  // Escapa primeiro os caracteres HTML <, >, & para evitar quebras de tags
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Converte negrito *texto* para <b>texto</b>
  escaped = escaped.replace(/\*(.*?)\*/g, '<b>$1</b>');
  
  // Converte tachado ~texto~ para <s>texto</s>
  escaped = escaped.replace(/~(.*?)~/g, '<s>$1</s>');
  
  // Converte itálico _texto_ para <i>texto</i>
  escaped = escaped.replace(/_(.*?)_/g, '<i>$1</i>');
  
  return escaped;
}

/**
 * Envia uma mensagem (com imagem opcional) para os canais cadastrados daquele nicho no Telegram.
 * Implementa retry automático com backoff exponencial.
 * @param {string} message Texto da mensagem
 * @param {string} image URL da imagem
 * @param {string} niche Categoria da oferta
 * @returns {Promise<boolean>} True se foi enviado com sucesso para pelo menos um grupo
 */
async function sendToTelegram(message, image, niche) {
  if (!bot) {
    console.log(`[Telegram - Simulação] Nicho: ${niche}\nMensagem:\n${message}`);
    return false;
  }

  try {
    // Buscar o target_id do grupo/canal para este nicho
    const groups = await db.getQuery(
      'SELECT target_id FROM groups WHERE niche = ? AND platform = ?', 
      [niche, 'telegram']
    );
    
    if (groups.length === 0) {
      console.log(`Nenhum grupo do Telegram configurado para o nicho: ${niche}`);
      return false;
    }

    let overallSuccess = false;
    const htmlMessage = convertWhatsappToTelegramHtml(message);

    for (const group of groups) {
      const chatId = group.target_id;
      let success = false;
      const retries = 3;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          if (image) {
            try {
              await bot.sendPhoto(chatId, image, { caption: htmlMessage, parse_mode: 'HTML' });
            } catch (imgErr) {
              console.warn(`[Telegram] ⚠️ Falha ao enviar foto para ${chatId}. Tentando enviar apenas texto. Erro: ${imgErr.message}`);
              await bot.sendMessage(chatId, htmlMessage, { parse_mode: 'HTML' });
            }
          } else {
            await bot.sendMessage(chatId, htmlMessage, { parse_mode: 'HTML' });
          }
          console.log(`[Telegram] ✅ Oferta enviada com sucesso (Nicho: ${niche}, ChatID: ${chatId})`);
          success = true;
          overallSuccess = true;
          break; // Sai do loop de retries
        } catch (err) {
          const delay = 1000 * attempt;
          console.warn(`[Telegram] ⚠️  Falha ao enviar para ${chatId} (Tentativa ${attempt}/${retries}). Erro: ${err.message}`);
          if (attempt < retries) {
            await sleep(delay);
          }
        }
      }

      if (!success) {
        console.error(`[Telegram] ❌ Falha permanente ao enviar para o canal ${chatId} do nicho ${niche} após ${retries} tentativas.`);
      }
    }
    
    return overallSuccess;
  } catch (error) {
    console.error('[Telegram] Erro crítico ao processar despacho no banco de dados:', error.message);
    return false;
  }
}

module.exports = {
  sendToTelegram,
  convertWhatsappToTelegramHtml
};

const { convertWhatsappToTelegramHtml } = require('./src/services/telegramService');

const text = `🔥 Oferta encontrada!

A tecnologia a seu favor, num precinho que cabe no orçamento.

📦 Produto: Smart TV 55 polegadas
💰 De: ~R$ 3.990,00~
✅ Por: R$ 2.499,00
📉 Desconto: 37%

🛒 Comprar aqui:
https://www.amazon.com.br/dp/B08N1HGQ6R?tag=hiurykng-20

⚠️ Preço e disponibilidade podem mudar a qualquer momento.`;

console.log('=== TESTE DE CONVERSÃO DE FORMATO ===');
console.log('Original:\n', text);
console.log('\n─'.repeat(20));
console.log('Convertido para HTML:\n', convertWhatsappToTelegramHtml(text));

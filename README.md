# Offers Bot

Sistema em Node.js para automação de envio de ofertas de produtos para Telegram e WhatsApp.

## Recursos
- Classificação automática de produtos por nicho baseada em palavras-chave.
- Geração de textos persuasivos curtos, incluindo preços e links de afiliados.
- Fila de processamento com delay ajustável para evitar spam.
- Integração com Telegram (via Bot API) enviando imagem e texto formatado.
- Fila de WhatsApp manual (salva mensagens para copiar/colar), pronta para integração futura.
- API REST completa.
- Banco de dados SQLite local.
- Suporte para importação via API, `products.json` e `products.csv`.

## Instalação

1. Clone ou baixe o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente:
   - Copie o arquivo `.env.example` para `.env`
   - Preencha `TELEGRAM_BOT_TOKEN` com o token do seu bot (obtido no @BotFather).
   - Configure os delays e a porta.

## Como Executar

Para rodar em ambiente de desenvolvimento/teste:
```bash
npm start
```

### Rodar 24/7 (Produção com PM2)

Caso utilize uma VPS, você pode manter o bot rodando 24/7 com PM2:
```bash
# Instalar PM2 globalmente (caso não tenha)
npm install -g pm2

# Iniciar o bot
pm2 start src/index.js --name offers-bot

# Salvar configuração para reiniciar junto com o sistema
pm2 save
pm2 startup
```

## Configurando os Grupos de Destino

Antes de processar as ofertas, você precisa cadastrar os IDs/Nomes dos grupos para onde as ofertas irão.
Exemplo via cURL:

**Cadastrar grupo do Telegram para o nicho Gamer:**
```bash
curl -X POST http://localhost:3000/groups \
-H "Content-Type: application/json" \
-d '{"niche": "Gamer", "platform": "telegram", "target_id": "@MeuCanalGamer"}'
```

*(O `target_id` pode ser o `@username` de um canal público ou o ID numérico, como `-1001234567890`)*

## Enviando Ofertas

Você pode alimentar o bot de 3 formas:

1. **API (Manualmente)**
   ```bash
   curl -X POST http://localhost:3000/offers \
   -H "Content-Type: application/json" \
   -d '{"name": "Teclado Mecânico Gamer", "oldPrice": 250, "currentPrice": 189.90, "discount": 24, "image": "http://img.com/a.jpg", "affiliateLink": "http://amzn.to/abc"}'
   ```

2. **Via Arquivo products.json**
   Adicione os produtos no arquivo `data/products.json` e chame a rota para forçar o processamento:
   ```bash
   curl -X POST http://localhost:3000/run-now
   ```

3. **Via Arquivo products.csv**
   Adicione produtos no arquivo `data/products.csv` e chame a rota `/run-now` ou espere o cronjob diário (configurado em `src/index.js`).

## WhatsApp

Atualmente, o WhatsApp funciona no modo de exportação manual (sem biblioteca não-oficial).
Para ver as mensagens prontas para envio, acesse:
```
GET http://localhost:3000/whatsapp-queue
```

Após enviar manualmente (ou criar seu próprio robô que consuma essa API), marque como enviada:
```bash
curl -X POST http://localhost:3000/mark-whatsapp-sent \
-H "Content-Type: application/json" \
-d '{"id": 1}'
```

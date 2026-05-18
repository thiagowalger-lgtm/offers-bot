const axios = require('axios');
const cheerio = require('cheerio');

async function fetchWithRetry(url, retries = 3) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
  ];

  for (let i = 0; i < retries; i++) {
    try {
      const ua = userAgents[i % userAgents.length];
      console.log(`Tentativa ${i+1} com UA: ${ua.substring(0, 40)}...`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000,
        validateStatus: status => status === 200 // Só aceita 200
      });
      return response.data;
    } catch (err) {
      console.error(`Falha na tentativa ${i+1}: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('Todas as tentativas falharam com 503.');
}

async function test() {
  try {
    const html = await fetchWithRetry('https://www.amazon.com.br/s?k=ofertas&page=1');
    const $ = cheerio.load(html);
    const items = $('div[data-component-type="s-search-result"]');
    console.log(`Sucesso! Encontrados ${items.length} itens.`);
  } catch (e) {
    console.log(e.message);
  }
}

test();

const axios = require('axios');
const cheerio = require('cheerio');
const { parsePrice, validatePriceData } = require('./priceValidator');
const { buildCleanAffiliateLink } = require('./linkCleaner');

/**
 * Realiza requisição com tentativas (retry) e rotação de User-Agent.
 * @param {string} url 
 * @param {number} retries 
 * @returns {Promise<string>} HTML da página
 */
async function fetchWithRetry(url, retries = 3) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1'
  ];

  for (let i = 0; i < retries; i++) {
    try {
      const ua = userAgents[i % userAgents.length];
      const response = await axios.get(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000,
        validateStatus: status => status === 200
      });
      return response.data;
    } catch (err) {
      const delay = 1500 * (i + 1);
      console.warn(`[Scraper Retry] Falha ao acessar ${url} (Tentativa ${i+1}/${retries}). Motivo: ${err.message}. Retentando em ${delay}ms...`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error('Bloqueio persistente ou falha de conexão na Amazon (503 / Timeout)');
}

/**
 * Raspa os dados de uma página de produto da Amazon.
 * @param {string} url 
 * @returns {Promise<object>} Dados do produto limpos e validados
 */
async function scrapeAmazonProduct(url) {
  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);

    // 1. Título
    const title = $('#productTitle').text().trim() ||
      $('.qa-title-text').text().trim() ||
      $('title').text().replace('Amazon.com.br:', '').trim();

    if (!title || title.length < 5) {
      throw new Error('Título do produto não encontrado ou muito curto na página.');
    }

    // Função auxiliar para tentar compor preço a partir do container de inteiros e frações
    function extractFromWholeFraction(container) {
      if (!container || container.length === 0) return '';
      const whole = container.find('.a-price-whole').first().text().trim().replace(/[^\d]/g, '');
      const fraction = container.find('.a-price-fraction').first().text().trim().replace(/[^\d]/g, '');
      if (whole) {
        return `${whole}.${fraction || '00'}`;
      }
      return '';
    }

    // 2. Preço Atual - Seletores estendidos
    let currentPriceStr = 
      $('.a-price.aok-align-center .a-offscreen').first().text().trim() ||
      $('.priceToPay .a-offscreen').first().text().trim() ||
      $('#corePriceDisplay_desktop_feature_div .a-price .a-offscreen').first().text().trim() ||
      $('.a-price.a-text-price.a-size-medium .a-offscreen').first().text().trim() ||
      $('#kindle-price').first().text().trim() ||
      $('#price_inside_buybox').first().text().trim() ||
      $('.a-color-price').first().text().trim();

    // Se falhou e existe o container a-price, tenta extrair da combinação inteiros + fração
    if (!currentPriceStr) {
      currentPriceStr = 
        extractFromWholeFraction($('.a-price.aok-align-center')) ||
        extractFromWholeFraction($('.priceToPay')) ||
        extractFromWholeFraction($('#corePriceDisplay_desktop_feature_div .a-price'));
    }

    // 3. Preço Antigo - Seletores estendidos
    let oldPriceStr = 
      $('.a-text-price[data-a-strike="true"] .a-offscreen').first().text().trim() ||
      $('#corePriceDisplay_desktop_feature_div .a-text-price[data-a-strike="true"] .a-offscreen').first().text().trim() ||
      $('.a-text-strike').first().text().trim() ||
      $('.priceBlockStrikePriceString').first().text().trim() ||
      $('#basisPrice .a-offscreen').first().text().trim() ||
      $('.basisPrice .a-offscreen').first().text().trim();

    if (!oldPriceStr) {
      oldPriceStr = 
        extractFromWholeFraction($('.a-text-price[data-a-strike="true"]')) ||
        extractFromWholeFraction($('#corePriceDisplay_desktop_feature_div .a-text-price[data-a-strike="true"]')) ||
        extractFromWholeFraction($('#basisPrice')) ||
        extractFromWholeFraction($('.basisPrice'));
    }

    // 4. Imagem do produto
    let image = '';
    
    // Tenta obter do JSON dinâmico
    const dynamicImageAttr = $('#landingImage').attr('data-a-dynamic-image') || $('#imgBlkFront').attr('data-a-dynamic-image');
    if (dynamicImageAttr) {
      try {
        const parsedImages = JSON.parse(dynamicImageAttr);
        image = Object.keys(parsedImages).sort((a, b) => {
          const sizeA = parsedImages[a][0] * parsedImages[a][1];
          const sizeB = parsedImages[b][0] * parsedImages[b][1];
          return sizeB - sizeA;
        })[0];
      } catch (e) {
        // Ignora erro
      }
    }

    // Fallbacks de imagem
    if (!image) {
      image = $('#landingImage').attr('data-old-hires') ||
              $('#imgBlkFront').attr('data-old-hires') ||
              $('.a-dynamic-image').attr('data-old-hires');
    }

    if (!image || image.startsWith('data:image')) {
      image = $('#landingImage').attr('src') || $('#imgBlkFront').attr('src');
    }

    if (!image || image.startsWith('data:image')) {
      image = $('meta[property="og:image"]').attr('content') || '';
    }

    // Limpa a URL da imagem para obter a versão em alta resolução (remove parâmetros de redimensionamento)
    if (image && image.includes('._')) {
      image = image.split('._')[0] + '.jpg';
    }

    // 5. Cupons e Selos visuais
    const couponText = $('.s-coupon-highlight-color').text().trim() || $('.s-coupon-unclipped').text().trim() || $('#promoPriceBlockMessage_feature_div').text().trim() || '';
    const badgeText = $('span[data-a-badge-color]').text().trim() || $('.a-badge-text').text().trim() || '';

    // Monta o link de afiliado limpo utilizando o linkCleaner
    const affiliateLink = buildCleanAffiliateLink(url);
    if (!affiliateLink) {
      throw new Error('Falha ao processar ou extrair ASIN a partir da URL do produto.');
    }

    // Monta objeto preliminar de produto
    const productRaw = {
      name: title,
      currentPrice: parsePrice(currentPriceStr),
      oldPrice: parsePrice(oldPriceStr),
      image: image || '',
      affiliateLink: affiliateLink,
      coupon: couponText,
      badge: badgeText
    };

    // Validação rígida através do priceValidator
    const validation = validatePriceData(productRaw);
    if (!validation.valid) {
      throw new Error(`[Scraper Validação] Produto descartado: ${validation.reason}`);
    }

    // Retorna o produto limpo
    return validation.cleanProduct;

  } catch (error) {
    console.error(`[Scraper] ❌ Erro ao raspar produto:`, error.message);
    throw error;
  }
}

/**
 * Expande URLs encurtadas (ex: amzn.to) seguindo redirecionamentos.
 * @param {string} url 
 * @returns {Promise<string>} URL expandida
 */
async function expandUrl(url) {
  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    return response.request.res.responseUrl || url;
  } catch (error) {
    if (error.response && error.response.request && error.response.request.res) {
      return error.response.request.res.responseUrl || url;
    }
    return url;
  }
}

/**
 * Função pública principal do scraper para links individuais
 * @param {string} link 
 * @returns {Promise<object>} Produto pronto
 */
async function scrapeLink(link) {
  console.log(`[Scraper] Iniciando raspagem manual de link: ${link.substring(0, 60)}...`);
  const finalUrl = await expandUrl(link);
  return await scrapeAmazonProduct(finalUrl);
}

module.exports = {
  scrapeLink,
  scrapeAmazonProduct
};

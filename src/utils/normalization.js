const { extractAsin } = require('../services/linkCleaner');

/**
 * Normaliza a identidade de um produto baseado no ASIN e num hash simplificado do título.
 * Elimina cores, voltagens, pesos, tamanhos e stop words para colapsar variantes.
 * @param {string} productName 
 * @param {string} affiliateLink 
 * @returns {object} { asin: string|null, titleHash: string }
 */
function normalizeProductIdentity(productName, affiliateLink) {
  // 1. Extrai o ASIN da URL
  const asin = extractAsin(affiliateLink);

  // 2. Normalização do Título (Filtro de Variações de Produto Agressivo)
  let titleHash = '';
  if (productName) {
    const stopWords = new Set([
      'de', 'com', 'para', 'em', 'por', 'do', 'da', 'no', 'na', 'e', 'a', 'o', 'un', 'und', 'kit', 'jogo', 'par', 'novo', 'nova',
      'preto', 'preta', 'verde', 'azul', 'branco', 'branca', 'rosa', 'vermelho', 'vermelha', 'cinza', 'prata', 'dourado', 'dourada', 'marfim',
      '110v', '220v', 'bivolt', 'volts', 'volt', 'ml', 'g', 'kg', 'l', 'litros', 'litro', 'mm', 'polegadas'
    ]);
    
    // Normalização inicial do texto
    let clean = productName.toLowerCase();
    
    // Remove unidades de medida, capacidade, peso e voltagens comuns (ex: 64gb, 15kg, 110v, 20cm, 7200 dpi)
    clean = clean.replace(/\b\d+\s*(gb|g|kg|ml|l|cm|mm|w|v|mah|in|tb|fps|hz|dpi)\b/gi, ' ');
    
    // Remove capacidades de armazenamento/memória avulsas típicas de variação (ex: 64, 128, 256, 512)
    clean = clean.replace(/\b(64|128|256|512)\b/gi, ' ');
    
    // Remove acentos e substitui pontuações por espaços
    clean = clean
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\sÀ-ÿ]/g, ' ')
      .trim();
      
    const words = clean.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
    
    // Usa as primeiras 4 palavras mais significativas
    const significantWords = words.slice(0, 4);
    
    // Ordena alfabeticamente para evitar duplicação por mudança de ordem
    significantWords.sort();
    
    titleHash = significantWords.join('_');
  }

  return { asin, titleHash };
}

function getSignificantWords(name) {
  if (!name) return new Set();
  const stopWords = new Set(['de', 'com', 'para', 'em', 'por', 'do', 'da', 'no', 'na', 'e', 'a', 'o', 'un', 'und']);
  const words = name.replace(/[^\w\sÀ-ÿ]/g, '').trim().split(/\s+/).map(w => w.toLowerCase());
  return new Set(words.filter(w => w.length > 1 && !stopWords.has(w)));
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

module.exports = {
  normalizeProductIdentity,
  getSignificantWords,
  jaccardSimilarity
};

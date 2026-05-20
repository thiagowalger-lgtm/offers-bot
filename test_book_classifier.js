const { sanitizeCategory } = require('./src/services/categoryClassifier');

const testProducts = [
  {
    name: 'Confissões de Santo Agostinho - Edição de Luxo Almofadada',
    affiliateLink: 'https://www.amazon.com.br/dp/6584956393?tag=hiurykng-20',
    keywordSource: 'maquiagem' // deliberately wrong keyword source
  },
  {
    name: 'A Divina Comédia',
    affiliateLink: 'https://www.amazon.com.br/dp/8534938342?tag=hiurykng-20',
    keywordSource: 'teclado gamer' // deliberately wrong keyword source
  },
  {
    name: 'Teclado Mecânico Gamer Razer',
    affiliateLink: 'https://www.amazon.com.br/dp/B07Y9WYQ7W?tag=hiurykng-20',
    keywordSource: 'teclado gamer'
  }
];

console.log('=== TESTE DE CLASSIFICAÇÃO DE LIVROS ===');
for (const p of testProducts) {
  const resultCategory = sanitizeCategory(p, 'Outros');
  console.log(`Produto: "${p.name}"`);
  console.log(`-> Categoria Sanitizada: "${resultCategory}"`);
  console.log('─'.repeat(40));
}

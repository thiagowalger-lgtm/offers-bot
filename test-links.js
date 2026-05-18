const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  console.log('Abrindo navegador...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  console.log('Acessando Amazon Deals...');
  await page.goto('https://www.amazon.com.br/deals', { waitUntil: 'networkidle2' });
  
  const links = await page.evaluate(() => {
    // Pegar todas as âncoras na div principal de ofertas
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors.map(a => a.href).filter(href => href && href.includes('amazon.com.br') && !href.includes('nav_') && !href.includes('ref='));
  });
  
  console.log('Total de links extraídos (amostra sem ref=):', links.length);
  console.log('Amostra de 10 links únicos:');
  const unique = [...new Set(links)];
  console.log(unique.slice(0, 10));
  
  await page.screenshot({ path: 'amazon_deals.png' });
  
  await browser.close();
  console.log('Fim.');
})();

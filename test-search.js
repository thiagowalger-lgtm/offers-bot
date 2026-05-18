const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://www.amazon.com.br/s?k=ofertas', { waitUntil: 'networkidle2' });

  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/dp/"]'));
    return anchors.map(a => a.href);
  });

  console.log('Total de links de produtos na busca:', links.length);
  if (links.length > 0) console.log(links[0]);

  await browser.close();
})();

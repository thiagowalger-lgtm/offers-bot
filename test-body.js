const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://www.amazon.com.br/deals', { waitUntil: 'networkidle2' });
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log('--- BODY TEXT START ---');
  console.log(text.substring(0, 1000));
  console.log('--- BODY TEXT END ---');
  
  await browser.close();
})();

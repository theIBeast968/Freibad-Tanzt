const path = require('path');
const fs = require('fs');

const dir = __dirname;
const puppeteerPath = path.join(dir, '..', 'node_modules', 'puppeteer');
const puppeteer = require(puppeteerPath);

async function main() {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/snap/bin/brave',
    headless: 'new',
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  const fileUrl = 'file://' + path.join(dir, 'icon-gen.html');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  const sizes = [512, 192, 32];
  const base = 512;
  for (const size of sizes) {
    await page.setViewport({ width: base, height: base, deviceScaleFactor: size / base });
    await page.evaluate((s, b) => {
      document.body.style.width = b + 'px';
      document.body.style.height = b + 'px';
      document.body.style.margin = '0';
      const wrap = document.querySelector('.logo-wrap');
      wrap.style.width = b + 'px';
      wrap.style.height = b + 'px';
      wrap.style.padding = (b * 0.047) + 'px';
    }, size, base);
    await new Promise((r) => setTimeout(r, 100));

    const name = size === 32 ? 'favicon-32.png' : `icon-${size}.png`;
    await page.screenshot({
      path: path.join(dir, name),
      omitBackground: true,
    });
    console.log('Written', name, '(' + size + 'x' + size + ')');
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generatePDF(html) {
  let browser;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();

    await page.emulateMediaType('screen');

    await page.setContent(html, {
      waitUntil: ['load', 'domcontentloaded']
    });

    await sleep(1500);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      scale: 1.1
    });

    await browser.close();
    return pdf;

  } catch (error) {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }

    throw new Error(`PDF Generation Error: ${error.message}`);
  }
}

module.exports = { generatePDF };

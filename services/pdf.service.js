const puppeteer = require('puppeteer');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generatePDF(html) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 1600 });
    await page.emulateMediaType('screen');

    await page.setContent(html, {
      waitUntil: ['load', 'domcontentloaded']
    });

    // ✅ Version-safe wait (replaces page.waitForTimeout)
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
      scale: 1.2
    });

    return pdf;

  } catch (error) {
    throw new Error(`PDF Generation Error: ${error.message}`);

  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

module.exports = { generatePDF };

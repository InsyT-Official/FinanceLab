const puppeteer = require('puppeteer');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generatePDF(html) {
  let browser;

  try {
    // Try launching with executable path first (for Render environment)
    const launchOptions = {
      headless: true,
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--single-process=false'
      ]
    };

    // On Render, try to use system Chrome if available
    if (process.env.NODE_ENV === 'production') {
      launchOptions.executablePath = '/usr/bin/chromium-browser' || '/usr/bin/google-chrome';
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 1600 });
    await page.emulateMediaType('screen');

    await page.setContent(html, {
      waitUntil: ['load', 'domcontentloaded']
    });

    // Version-safe wait
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

    if (browser) {
      await browser.close();
    }

    return pdf;

  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }

    // Return a more helpful error message
    const errorMsg = error.message || error;
    if (errorMsg.includes('Chrome') || errorMsg.includes('Chromium')) {
      throw new Error('PDF generation temporarily unavailable. Please try again or use HTML export instead.');
    }
    throw new Error(`PDF Generation Error: ${errorMsg}`);
  }
}

module.exports = { generatePDF };

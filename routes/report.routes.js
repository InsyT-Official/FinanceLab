const express = require('express');
const router = express.Router();
const ejs = require('ejs');
const path = require('path');
const { getFinancialData } = require('../services/financial.service');
const { generatePDF } = require('../services/pdf.service');

/**
 * POST /generate-pdf
 * Generate PDF from dashboard with current data
 */
router.post('/generate-pdf', async (req, res) => {
  try {
    const { company, financeData, dashboardHtml } = req.body;

    if (!company || !financeData) {
      return res.status(400).json({ error: 'Missing company or financial data' });
    }

    // Create a complete HTML document with full dashboard styling
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${company} - Financial Report</title>
  <style>
    * { box-sizing: border-box; }
    
    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      font-family: "Inter", "Segoe UI", system-ui, sans-serif;
      background: radial-gradient(circle at top left, #031926, #000b12 70%);
      color: #e6f1f7;
      overflow-x: hidden;
      padding: 40px 20px;
    }

    .report-header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #00ffff;
      padding-bottom: 20px;
    }

    .report-header h1 {
      margin: 0;
      font-size: 2.5em;
      color: #00ffff;
      font-weight: 700;
    }

    .report-header p {
      margin: 5px 0;
      color: #8fd9ff;
      font-size: 1.1em;
    }

    .report-date {
      text-align: right;
      color: #8fd9ff;
      font-size: 0.95em;
      margin-bottom: 20px;
      font-style: italic;
    }

    /* Dashboard Styling */
    .dashboard {
      width: 100%;
    }

    .dashboard h2 {
      color: #00ffff;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.4em;
      font-weight: 600;
      border-bottom: 2px solid #00a4cc;
      padding-bottom: 10px;
    }

    section {
      margin: 30px 0;
      page-break-inside: avoid;
    }

    .statement {
      margin: 30px 0;
    }

    .statement h3 {
      color: #00ffff;
      font-size: 1.2em;
      margin: 20px 0 15px 0;
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      background: rgba(0, 0, 0, 0.3);
    }

    table th {
      background: rgba(0, 255, 255, 0.1);
      color: #00ffff;
      border: 1px solid rgba(0, 255, 255, 0.2);
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }

    table td {
      border: 1px solid rgba(0, 255, 255, 0.1);
      padding: 10px 12px;
      color: #e6f1f7;
    }

    table tr:nth-child(even) {
      background: rgba(0, 255, 255, 0.05);
    }

    table td.number {
      text-align: right;
      font-family: 'Courier New', monospace;
      color: #8fd9ff;
      font-weight: 500;
    }

    /* Analysis Section */
    .analysis-section {
      margin: 40px 0;
      page-break-inside: avoid;
    }

    .analysis-section h2 {
      color: #00ffff;
      font-size: 1.4em;
      margin-top: 30px;
      margin-bottom: 20px;
      border-bottom: 2px solid #00a4cc;
      padding-bottom: 10px;
    }

    .analysis-content {
      margin: 15px 0;
    }

    .analysis-content table {
      width: 100%;
      margin: 15px 0;
    }

    /* Chart styling */
    img {
      max-width: 100%;
      height: auto;
      margin: 30px 0;
      border: 1px solid rgba(0, 255, 255, 0.2);
      padding: 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
    }

    canvas {
      max-width: 100%;
      height: auto;
      margin: 20px 0;
    }

    /* Text Elements */
    h4 {
      color: #8fd9ff;
      font-size: 1.1em;
      margin: 15px 0 10px 0;
      font-weight: 600;
    }

    p {
      color: #e6f1f7;
      line-height: 1.6;
      margin: 10px 0;
    }

    strong {
      color: #ffd75e;
      font-weight: 600;
    }

    em {
      color: #8fd9ff;
      font-style: italic;
    }

    ul {
      list-style: none;
      padding-left: 20px;
      color: #e6f1f7;
    }

    ul li {
      margin: 8px 0;
      padding-left: 24px;
      position: relative;
    }

    ul li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: #00ffff;
      font-weight: bold;
      font-size: 1.2rem;
    }

    .section-actions {
      display: none;
    }

    .muted {
      color: #8fd9ff;
      font-style: italic;
      opacity: 0.8;
    }

    /* Page breaks */
    @media print {
      section {
        page-break-inside: avoid;
      }
      .statement {
        page-break-inside: avoid;
      }
      img {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${company}</h1>
    <p>📊 Financial Analysis Report</p>
    <p>Financial Intelligence System</p>
  </div>
  
  <div class="report-date">
    Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>

  ${dashboardHtml}

</body>
</html>
    `;

    const pdf = await generatePDF(fullHtml);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${company.replace(/\\s+/g, '-').toLowerCase()}-report.pdf"`);
    res.send(pdf);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Error generating PDF: ' + error.message });
  }
});

router.get('/pdf', async (req, res) => {
  try {
    const data = await getFinancialData('pinelands_construction');

    const html = await ejs.renderFile(path.join(__dirname, '../views/report.ejs'), { data });

    const pdf = await generatePDF(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=pinelands-report.pdf');
    res.send(pdf);
  } catch (error) {
    res.status(500).send('Error generating PDF');
  }
});

module.exports = router;

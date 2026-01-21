const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { loadFinancialData } = require('../services/csv.service');
const FinancialIntelligenceService = require('../services/intelligence.service');

// Global instance (could be improved with session management per user)
const intelligenceService = new FinancialIntelligenceService();

// Helper: Convert snake_case folder name to Title Case
function formatCompanyName(folderName) {
  return folderName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Home / Dashboard - empty by default
router.get('/', (req, res) => {
  res.render('dashboard', {
    title: 'Financial Dashboard',
    companyName: null,
    data: null
  });
});

// Open Dataset route - dynamic company
// Example: /open-dataset?company=redrock_holdings
router.get('/open-dataset', async (req, res) => {
  try {
    const { company } = req.query;

    if (!company) {
      return res.status(400).send('No company specified.');
    }

    // Optional: validate folder exists
    const datasetPath = path.join(__dirname, '..', 'datasets', company);
    if (!fs.existsSync(datasetPath)) {
      return res.status(404).send('Company dataset not found.');
    }

    const data = await loadFinancialData(company);

    // Load context into intelligence service
    intelligenceService.setFinancialContext(formatCompanyName(company), data);

    res.render('dashboard', {
      title: `${formatCompanyName(company)} – Financial Dashboard`,
      companyName: formatCompanyName(company),
      data
    });
  } catch (error) {
    console.error('Error loading dataset:', error);
    res.status(500).send('Error loading data');
  }
});

// AI Chat API endpoint
router.post('/api/chat', async (req, res) => {
  try {
    const { message, type = 'question', company, financeData } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }

    if (!financeData) {
      return res.status(400).json({ error: 'No financial data loaded. Please select a company first.' });
    }

    // Set the financial context from client data
    if (company && financeData) {
      intelligenceService.setFinancialContext(company, financeData);
    }

    let response;

    if (type === 'overview') {
      response = await intelligenceService.getBusinessOverview();
    } else if (type === 'scenario') {
      response = await intelligenceService.simulateScenario(message);
    } else {
      // Default: regular question
      response = await intelligenceService.chat(message);
    }

    res.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: error.message || 'Error processing chat' });
  }
});

module.exports = router;

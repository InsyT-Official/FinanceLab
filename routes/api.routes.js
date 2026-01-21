const express = require('express');
const router = express.Router();
const { analyzeFinancialQuestion, calculateMetric } = require('../services/financial.intelligence');

/**
 * POST /api/ask
 * Natural language financial question
 * Body: { question: string, company: string }
 */
router.post('/ask', async (req, res) => {
  try {
    const { question, company } = req.body;

    if (!question || !company) {
      return res.status(400).json({
        error: 'Missing required fields: question, company'
      });
    }

    const analysis = await analyzeFinancialQuestion(question, company);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({
      error: 'API error',
      details: error.message
    });
  }
});

/**
 * GET /api/metric/:company/:metric
 * Get a specific financial metric
 * Example: GET /api/metric/pinelands_construction/netmargin
 */
router.get('/metric/:company/:metric', async (req, res) => {
  try {
    const { company, metric } = req.params;
    const result = await calculateMetric(metric, company);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Metric calculation failed',
      details: error.message
    });
  }
});

/**
 * POST /api/scenario
 * Simulate a financial scenario (what-if analysis)
 * Body: { question: string, scenario: string, company: string }
 */
router.post('/scenario', async (req, res) => {
  try {
    const { question, scenario, company } = req.body;

    if (!question || !scenario || !company) {
      return res.status(400).json({
        error: 'Missing required fields: question, scenario, company'
      });
    }

    // Append scenario details to the question for analysis
    const enhancedQuestion = `${question}\n\nScenario: ${scenario}`;
    const analysis = await analyzeFinancialQuestion(enhancedQuestion, company);
    
    res.json({
      ...analysis,
      scenario
    });
  } catch (error) {
    res.status(500).json({
      error: 'Scenario analysis failed',
      details: error.message
    });
  }
});

module.exports = router;

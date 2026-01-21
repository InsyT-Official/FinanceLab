const { Groq } = require('groq-sdk');
const { validatePrompt } = require('./groq.service');
const { loadFinancialData } = require('./csv.service');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Financial Intelligence Service
 * Bridges natural language questions with financial calculations
 */

/**
 * Get financial analysis for a company using natural language
 * @param {string} question - User's natural language question
 * @param {string} company - Company folder name (e.g., 'pinelands_construction')
 * @returns {Promise<Object>} Analysis with answer, calculations, and explanations
 */
async function analyzeFinancialQuestion(question, company) {
  try {
    // Step 1: Validate the prompt for safety
    const safetyCheck = await validatePrompt(question);
    if (!safetyCheck.isValid) {
      return {
        success: false,
        error: 'Unsafe prompt detected',
        details: safetyCheck.message
      };
    }

    // Step 2: Load financial data for the company
    let financialData;
    try {
      financialData = await loadFinancialData(company);
    } catch (err) {
      return {
        success: false,
        error: 'Could not load financial data',
        details: err.message
      };
    }

    // Step 3: Build context about the financial data
    const dataContext = buildFinancialContext(financialData);

    // Step 4: Call Groq for analysis (using a faster model for reasoning)
    const systemPrompt = `You are a financial analyst with expertise in interpreting financial statements.
You have access to a company's financial data:
${dataContext}

Answer the user's question based on this data. Be specific with numbers and percentages.
Explain your reasoning and cite specific financial metrics.`;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: question
        }
      ],
      model: "mixtral-8x7b-32768", // Fast, capable model
      temperature: 0.3, // Lower temperature for factual accuracy
      max_completion_tokens: 1024,
      top_p: 1
    });

    const analysis = response.choices[0].message.content;

    return {
      success: true,
      answer: analysis,
      company,
      question,
      dataAvailable: {
        incomeStatementRows: financialData.incomeStatement?.length || 0,
        balanceSheetRows: financialData.balanceSheet?.length || 0,
        cashFlowRows: financialData.cashFlow?.length || 0
      }
    };
  } catch (error) {
    console.error('Financial analysis error:', error);
    return {
      success: false,
      error: 'Analysis failed',
      details: error.message
    };
  }
}

/**
 * Build a text summary of available financial data for LLM context
 */
function buildFinancialContext(financialData) {
  const income = financialData.incomeStatement || [];
  const balance = financialData.balanceSheet || [];
  const cashflow = financialData.cashFlow || [];

  let context = '## Available Financial Data\n\n';

  if (income.length > 0) {
    context += `**Income Statement**: ${income.length} periods\n`;
    context += `- Latest Revenue: ${income[income.length - 1]?.Revenue || 'N/A'}\n`;
    context += `- Latest Net Income: ${income[income.length - 1]?.Net_Income || 'N/A'}\n`;
  }

  if (balance.length > 0) {
    context += `\n**Balance Sheet**: ${balance.length} periods\n`;
    context += `- Latest Total Assets: ${balance[balance.length - 1]?.Total_Assets || 'N/A'}\n`;
    context += `- Latest Total Liabilities: ${balance[balance.length - 1]?.Total_Liabilities || 'N/A'}\n`;
  }

  if (cashflow.length > 0) {
    context += `\n**Cash Flow**: ${cashflow.length} periods\n`;
    context += `- Latest Operating Cash Flow: ${cashflow[cashflow.length - 1]?.Operating_Cash_Flow || 'N/A'}\n`;
  }

  context += '\nUse this data to answer specific financial questions accurately.';
  return context;
}

/**
 * Calculate a specific metric (margin, ROIC, etc.)
 * Used when you want to compute without LLM reasoning
 */
async function calculateMetric(metric, company, options = {}) {
  try {
    const financialData = await loadFinancialData(company);
    const income = financialData.incomeStatement || [];
    const balance = financialData.balanceSheet || [];

    let result = null;

    switch (metric.toLowerCase()) {
      case 'netmargin':
        result = calculateNetMargin(income);
        break;
      case 'operatingmargin':
        result = calculateOperatingMargin(income);
        break;
      case 'grossmargin':
        result = calculateGrossMargin(income);
        break;
      case 'roic':
        result = calculateROIC(income, balance);
        break;
      case 'roe':
        result = calculateROE(income, balance);
        break;
      case 'debttoequity':
        result = calculateDebtToEquity(balance);
        break;
      default:
        return { error: `Unknown metric: ${metric}` };
    }

    return {
      metric,
      company,
      result,
      periods: income.length,
      latest: result[result.length - 1] || null
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

// Financial calculation helpers
function calculateNetMargin(income) {
  return income.map(row => {
    const revenue = parseFloat(row.Revenue) || 0;
    const netIncome = parseFloat(row.Net_Income) || 0;
    return revenue === 0 ? 0 : (netIncome / revenue) * 100;
  });
}

function calculateOperatingMargin(income) {
  return income.map(row => {
    const revenue = parseFloat(row.Revenue) || 0;
    const operatingIncome = parseFloat(row.Operating_Income) || 0;
    return revenue === 0 ? 0 : (operatingIncome / revenue) * 100;
  });
}

function calculateGrossMargin(income) {
  return income.map(row => {
    const revenue = parseFloat(row.Revenue) || 0;
    const grossProfit = parseFloat(row.Gross_Profit) || 0;
    return revenue === 0 ? 0 : (grossProfit / revenue) * 100;
  });
}

function calculateROIC(income, balance) {
  const minLen = Math.min(income.length, balance.length);
  return Array.from({ length: minLen }, (_, i) => {
    const operatingIncome = parseFloat(income[i]?.Operating_Income) || 0;
    const nopat = operatingIncome * 0.75; // Assuming 25% tax rate
    const totalAssets = parseFloat(balance[i]?.Total_Assets) || 0;
    const currentLiabilities = parseFloat(balance[i]?.Accounts_Payable) || 0;
    const investedCapital = totalAssets - currentLiabilities;
    return investedCapital === 0 ? 0 : (nopat / investedCapital) * 100;
  });
}

function calculateROE(income, balance) {
  const minLen = Math.min(income.length, balance.length);
  return Array.from({ length: minLen }, (_, i) => {
    const netIncome = parseFloat(income[i]?.Net_Income) || 0;
    const equity = parseFloat(balance[i]?.Total_Assets) || 0 - parseFloat(balance[i]?.Total_Liabilities) || 0;
    return equity === 0 ? 0 : (netIncome / equity) * 100;
  });
}

function calculateDebtToEquity(balance) {
  return balance.map(row => {
    const liabilities = parseFloat(row.Total_Liabilities) || 0;
    const equity = parseFloat(row.Total_Assets) || 0 - liabilities;
    return equity === 0 ? 0 : liabilities / equity;
  });
}

module.exports = {
  analyzeFinancialQuestion,
  calculateMetric,
  buildFinancialContext
};

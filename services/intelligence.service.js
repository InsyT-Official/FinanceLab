const { Groq } = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Analyzes financial data and generates AI-powered insights
 */
class FinancialIntelligenceService {
  constructor() {
    this.model = 'llama-3.3-70b-versatile';
    this.financialContext = null;
  }

  /**
   * Load financial context from datasets
   */
  setFinancialContext(company, datasets) {
    this.financialContext = {
      company,
      incomeStatement: datasets.incomeStatement || [],
      cashFlow: datasets.cashFlow || [],
      balanceSheet: datasets.balanceSheet || []
    };
  }

  /**
   * Calculate key metrics from financial data
   */
  calculateMetrics() {
    if (!this.financialContext) return {};

    const { incomeStatement, cashFlow, balanceSheet } = this.financialContext;
    const latest = (arr) => arr.length > 0 ? arr[arr.length - 1] : {};
    const latestIncome = latest(incomeStatement);
    const latestBalance = latest(balanceSheet);
    const latestCash = latest(cashFlow);

    const metrics = {
      revenue: parseFloat(latestIncome.Revenue) || 0,
      grossProfit: parseFloat(latestIncome.Gross_Profit) || 0,
      operatingIncome: parseFloat(latestIncome.Operating_Income) || 0,
      netIncome: parseFloat(latestIncome.Net_Income) || 0,
      totalAssets: parseFloat(latestBalance.Total_Assets) || 0,
      totalLiabilities: parseFloat(latestBalance.Total_Liabilities) || 0,
      equity: parseFloat(latestBalance.Equity) || 0,
      cash: parseFloat(latestBalance.Cash) || 0,
      operatingCashFlow: parseFloat(latestCash.Cash_From_Operations) || 0,
    };

    // Calculate ratios
    metrics.grossMargin = metrics.revenue > 0 ? (metrics.grossProfit / metrics.revenue * 100).toFixed(2) : 0;
    metrics.netMargin = metrics.revenue > 0 ? (metrics.netIncome / metrics.revenue * 100).toFixed(2) : 0;
    metrics.roa = metrics.totalAssets > 0 ? (metrics.netIncome / metrics.totalAssets * 100).toFixed(2) : 0;
    metrics.roe = metrics.equity > 0 ? (metrics.netIncome / metrics.equity * 100).toFixed(2) : 0;
    metrics.debtToEquity = metrics.equity > 0 ? (metrics.totalLiabilities / metrics.equity).toFixed(2) : 0;
    metrics.currentRatio = latestBalance.Current_Assets > 0 ? (latestBalance.Current_Assets / latestBalance.Current_Liabilities).toFixed(2) : 0;
    metrics.operatingMargin = metrics.revenue > 0 ? (metrics.operatingIncome / metrics.revenue * 100).toFixed(2) : 0;

    return metrics;
  }

  /**
   * Generate business summary for AI context
   */
  generateBusinessContext() {
    const metrics = this.calculateMetrics();
    
    return `
Business Profile:
- Company: ${this.financialContext.company}
- Revenue: $${(metrics.revenue / 1000000).toFixed(2)}M
- Net Income: $${(metrics.netIncome / 1000000).toFixed(2)}M
- Gross Margin: ${metrics.grossMargin}%
- Net Margin: ${metrics.netMargin}%
- Operating Margin: ${metrics.operatingMargin}%
- ROA: ${metrics.roa}%
- ROE: ${metrics.roe}%
- Debt-to-Equity: ${metrics.debtToEquity}x
- Current Ratio: ${metrics.currentRatio}x
- Total Assets: $${(metrics.totalAssets / 1000000).toFixed(2)}M
- Total Liabilities: $${(metrics.totalLiabilities / 1000000).toFixed(2)}M
- Cash Position: $${(metrics.cash / 1000000).toFixed(2)}M
- Operating Cash Flow: $${(metrics.operatingCashFlow / 1000000).toFixed(2)}M
    `;
  }

  /**
   * Analyze business health and provide recommendations
   */
  analyzeBusiness() {
    const metrics = this.calculateMetrics();
    const analysis = [];

    // Profitability Analysis
    if (metrics.netMargin > 20) {
      analysis.push('✅ Excellent profitability: Net margin above 20%');
    } else if (metrics.netMargin > 10) {
      analysis.push('✓ Good profitability: Net margin above 10%');
    } else if (metrics.netMargin > 0) {
      analysis.push('⚠️ Moderate profitability: Net margin below 10%');
    } else {
      analysis.push('🔴 Red flag: Negative net income');
    }

    // Liquidity Analysis
    if (metrics.currentRatio > 1.5) {
      analysis.push('✅ Strong liquidity: Current ratio above 1.5x');
    } else if (metrics.currentRatio > 1) {
      analysis.push('✓ Adequate liquidity: Current ratio above 1x');
    } else {
      analysis.push('🔴 Liquidity concern: Current ratio below 1x');
    }

    // Leverage Analysis
    if (metrics.debtToEquity < 1) {
      analysis.push('✅ Conservative leverage: Debt-to-equity below 1x');
    } else if (metrics.debtToEquity < 2) {
      analysis.push('⚠️ Moderate leverage: Debt-to-equity between 1-2x');
    } else {
      analysis.push('🔴 High leverage: Debt-to-equity above 2x');
    }

    // Return Analysis
    if (metrics.roe > 15) {
      analysis.push('✅ Strong returns: ROE above 15%');
    } else if (metrics.roe > 10) {
      analysis.push('✓ Good returns: ROE above 10%');
    } else {
      analysis.push('⚠️ Lower returns: ROE below 10%');
    }

    // Cash Generation
    if (metrics.operatingCashFlow > metrics.netIncome) {
      analysis.push('✅ Strong cash generation: Operating cash flow exceeds net income');
    } else if (metrics.operatingCashFlow > 0) {
      analysis.push('⚠️ Cash flow caution: Operating cash flow below net income');
    } else {
      analysis.push('🔴 Cash flow concern: Negative operating cash flow');
    }

    return analysis;
  }

  /**
   * Send message to Groq with financial context
   */
  async chat(userMessage) {
    try {
      if (!this.financialContext) {
        return 'Error: No financial data loaded. Please select a company first.';
      }

      const businessContext = this.generateBusinessContext();
      const businessAnalysis = this.analyzeBusiness();

      const systemPrompt = `You are a professional financial analyst with deep expertise in business analysis, financial metrics, and scenario modeling. 
You have access to detailed financial data for the company and understand industry standards.

${businessContext}

Key Health Indicators:
${businessAnalysis.join('\n')}

RESPONSE FORMAT GUIDELINES:
- Use clear headings with ## or ### for major sections
- Use bullet points (•) for lists of items
- Use bold (**text**) for key metrics and important points
- Use numbered lists for steps or sequential information
- Add a brief summary at the top
- Keep paragraphs concise (2-3 sentences max)
- Use line breaks between sections for readability

Your role:
1. Answer financial questions with specific data points and analysis
2. Identify trends and patterns in the financial data
3. Provide actionable insights and recommendations
4. Be specific - reference actual numbers, ratios, and metrics with proper formatting
5. Explain the "why" behind financial outcomes in clear language
6. Consider industry context and best practices
7. Flag risks (⚠️) and opportunities (✓) clearly
8. When asked about scenarios, explain the impacts realistically with examples

IMPORTANT: Always structure your response for maximum readability with proper formatting, headings, and whitespace. Don't speculate without data basis.`;

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ];

      const response = await groq.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_completion_tokens: 1024,
        top_p: 0.9
      });

      return response.choices[0]?.message?.content || 'No response generated';

    } catch (error) {
      console.error('Groq API error:', error);
      return `Error: ${error.message}`;
    }
  }

  /**
   * Simulate a scenario and provide impact analysis
   */
  async simulateScenario(scenario) {
    try {
      if (!this.financialContext) {
        return 'Error: No financial data loaded.';
      }

      const prompt = `Based on the financial data provided, simulate this scenario: "${scenario}"
      
Please provide:
1. Key impacts on revenue, expenses, and net income
2. Effects on balance sheet metrics
3. Changes to key ratios (margins, ROE, liquidity)
4. Risk assessment
5. Strategic recommendations

Be specific with estimated percentages and impacts.`;

      return await this.chat(prompt);

    } catch (error) {
      console.error('Scenario simulation error:', error);
      return `Error simulating scenario: ${error.message}`;
    }
  }

  /**
   * Brief business overview
   */
  async getBusinessOverview() {
    const analysis = this.analyzeBusiness();
    const metrics = this.calculateMetrics();

    const overview = `
📊 Financial Overview for ${this.financialContext.company}

**Key Metrics:**
• Revenue: $${(metrics.revenue / 1000000).toFixed(2)}M
• Net Income: $${(metrics.netIncome / 1000000).toFixed(2)}M
• Net Margin: ${metrics.netMargin}%
• ROE: ${metrics.roe}%
• Current Ratio: ${metrics.currentRatio}x

**Health Assessment:**
${analysis.join('\n')}
    `;

    try {
      const aiSummary = await this.chat(`Provide a concise 2-3 sentence executive summary of this business health: ${analysis.join(', ')}`);
      return overview + '\n\n**AI Analysis:**\n' + aiSummary;
    } catch (error) {
      return overview;
    }
  }
}

module.exports = FinancialIntelligenceService;

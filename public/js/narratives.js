// narratives.js
// Reusable templates for narrative generation. Keep statements short and composable.
export const TEMPLATES = {
  grossMargin: {
    high: "Gross margins are high, indicating strong pricing power or low cost of goods sold.",
    medium: "Gross margins are moderate, suggesting reasonable pricing and some room for efficiency improvements.",
    low: "Gross margins are low, which may indicate pricing pressure or elevated production costs."
  },
  revenueGrowth: {
    stable: "Revenue growth is stable month-over-month, indicating consistent demand.",
    volatile: "Revenue shows higher volatility month-over-month, suggesting irregular demand or seasonality.",
    declining: "Revenue is trending downward month-over-month, which may signal weakening demand."
  },
  liquidity: {
    healthy: "Liquidity appears healthy, with adequate short-term assets to cover liabilities.",
    warning: "Liquidity is tight; monitor short-term obligations and working capital closely."
  },
  leverage: {
    safe: "Leverage is within conservative bounds, reducing solvency risk.",
    risky: "Leverage is elevated relative to equity; this increases financial vulnerability during downturns."
  },
  netIncome: {
    positive: "Net income is positive and consistent, reflecting operational profitability.",
    negative: "Net income is negative, which could indicate persistent losses or one-off charges."
  }
};

export function generateNarrative(metrics = {}, standards = {}) {
  const parts = [];

  // Gross margin
  if (typeof metrics.avgGrossMargin === 'number') {
    const gm = metrics.avgGrossMargin;
    if (gm >= (standards.grossMarginPct?.high || 40)) parts.push(TEMPLATES.grossMargin.high);
    else if (gm <= (standards.grossMarginPct?.low || 20)) parts.push(TEMPLATES.grossMargin.low);
    else parts.push(TEMPLATES.grossMargin.medium);
  }

  // Revenue volatility / growth
  if (typeof metrics.revenueVolatility === 'number') {
    const vol = metrics.revenueVolatility;
    if (metrics.revenueTrend && metrics.revenueTrend < -0.5) {
      parts.push(TEMPLATES.revenueGrowth.declining);
    } else if (vol > (standards.revenueVolatilityPct || 8)) {
      parts.push(TEMPLATES.revenueGrowth.volatile);
    } else {
      parts.push(TEMPLATES.revenueGrowth.stable);
    }
  }

  // Liquidity
  if (typeof metrics.currentRatio === 'number') {
    const cr = metrics.currentRatio;
    if (cr >= (standards.currentRatio?.healthy || 1.5)) parts.push(TEMPLATES.liquidity.healthy);
    else parts.push(TEMPLATES.liquidity.warning);
  }

  // Leverage
  if (typeof metrics.debtToEquity === 'number') {
    const de = metrics.debtToEquity;
    if (de <= (standards.debtToEquity?.safe || 1.0)) parts.push(TEMPLATES.leverage.safe);
    else if (de >= (standards.debtToEquity?.risky || 2.0)) parts.push(TEMPLATES.leverage.risky);
    else parts.push(TEMPLATES.leverage.safe);
  }

  // Net income
  if (typeof metrics.netIncomeAvg === 'number') {
    const ni = metrics.netIncomeAvg;
    if (ni >= (standards.netIncomeBaseline || 0)) parts.push(TEMPLATES.netIncome.positive);
    else parts.push(TEMPLATES.netIncome.negative);
  }

  // Combine into 1-2 paragraph narrative
  if (!parts.length) return 'No narrative available for the loaded dataset.';
  const para1 = parts.slice(0, Math.ceil(parts.length / 2)).join(' ');
  const para2 = parts.slice(Math.ceil(parts.length / 2)).join(' ');
  return para2 ? `${para1} ${para2}` : para1;
}

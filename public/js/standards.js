// standards.js
// Industry-aligned numeric thresholds used by the narrative engine
export const STANDARDS = {
  grossMarginPct: { high: 40, low: 20 }, // in percent
  revenueVolatilityPct: 8, // average absolute MoM change in percent considered volatile
  currentRatio: { healthy: 1.5, warning: 1.0 },
  debtToEquity: { safe: 1.0, risky: 2.0 },
  netIncomeBaseline: 0 // positive vs negative
};

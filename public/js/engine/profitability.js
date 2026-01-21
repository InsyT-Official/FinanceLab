// profitability.js
// Profitability & Return Engine (time-series)

import {
  safeNumber,
  margin,
  series
} from "./core.js";


/*
Produces arrays over time, not single values.
Each function returns: [m1, m2, m3, ...]
*/


// -----------------------------
// MARGINS
// -----------------------------
export function grossMarginSeries(income = []) {
  return series(income, row =>
    margin(row.Gross_Profit, row.Revenue)
  );
}

export function operatingMarginSeries(income = []) {
  return series(income, row =>
    margin(row.Operating_Income, row.Revenue)
  );
}

export function netMarginSeries(income = []) {
  return series(income, row =>
    margin(row.Net_Income, row.Revenue)
  );
}


// -----------------------------
// ROIC
// -----------------------------
export function roicSeries(income = [], balance = [], taxRate = 0.25) {
  const length = Math.min(income.length, balance.length);

  return Array.from({ length }, (_, i) => {

    const operatingIncome = safeNumber(income[i]?.Operating_Income);
    const nopat = operatingIncome * (1 - taxRate);

    const totalAssets = safeNumber(balance[i]?.Total_Assets);
    const currentLiabilities = safeNumber(balance[i]?.Accounts_Payable) + safeNumber(balance[i]?.Loans);

    const investedCapital = totalAssets - currentLiabilities;

    if (investedCapital === 0) return 0;

    return nopat / investedCapital;
  });
}


// -----------------------------
// DASHBOARD BUNDLE
// -----------------------------
export function buildProfitabilityEngine(income = [], balance = []) {
  return {
    grossMargin: grossMarginSeries(income),
    operatingMargin: operatingMarginSeries(income),
    netMargin: netMarginSeries(income),
    roic: roicSeries(income, balance)
  };
}

// Backwards-compatible single-name exports (some older modules call these directly)
export function grossMargin(income = []) { return grossMarginSeries(income); }
export function operatingMargin(income = []) { return operatingMarginSeries(income); }
export function netMargin(income = []) { return netMarginSeries(income); }
export function roic(income = [], balance = [], taxRate = 0.25) { return roicSeries(income, balance, taxRate); }

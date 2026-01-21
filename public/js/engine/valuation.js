// valuation.js
// Valuation Engine (time-series, defensive)

import { safeNumber } from "./core.js";

/*
Produces valuation-relevant series instead of single values.
All functions are defensive and chart-safe.
*/


// -----------------------------------
// FREE CASH FLOW SERIES
// -----------------------------------
export function freeCashFlowSeries(cashflow = []) {
  return cashflow.map(row => {
    const ops = safeNumber(
      row.Operating_Cash_Flow ??
      row.Cash_From_Operations
    );

    const capex = safeNumber(
      row.Capex ??
      row.CapEx ??
      row.Capital_Expenditure ??
      row.Investing_Capex
    );

    return ops - capex;
  });
}


// -----------------------------------
// DISCOUNTED CASH FLOW (DCF)
// -----------------------------------
export function discountedCashFlow(cashflows = [], discountRate = 0.12) {
  if (!cashflows.length) return 0;

  return cashflows.reduce((value, cf, i) => {
    return value + safeNumber(cf) / Math.pow(1 + discountRate, i + 1);
  }, 0);
}


// -----------------------------------
// SIMPLE TERMINAL VALUE
// -----------------------------------
export function terminalValue(lastFCF = 0, growthRate = 0.03, discountRate = 0.12) {
  if (discountRate <= growthRate) return 0;

  return (lastFCF * (1 + growthRate)) / (discountRate - growthRate);
}


// -----------------------------------
// FULL DCF ENGINE
// -----------------------------------
export function buildValuationEngine(cashflow = []) {
  const fcfSeries = freeCashFlowSeries(cashflow);

  const dcfValue = discountedCashFlow(fcfSeries);
  const terminal = terminalValue(fcfSeries.at(-1));

  return {
    freeCashFlow: fcfSeries,
    dcf: dcfValue,
    terminalValue: terminal,
    intrinsicValue: dcfValue + terminal
  };
}

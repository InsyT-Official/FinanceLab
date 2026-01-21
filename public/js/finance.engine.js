// finance.engine.js
import * as WC from "./engine/workingCapital.js";
import * as Profit from "./engine/profitability.js";
import * as Valuation from "./engine/valuation.js";

/*
  Extended Finance Engine
  - Ensures all analysis sections have metrics
  - Returns raw datasets for charts
  - Safe against missing/undefined data
*/

export function runFinanceEngine(financeData) {
  const income = financeData.incomeStatement || [];
  const balance = financeData.balanceSheet || [];
  const cashflow = financeData.cashFlow || [];

  // ------------------------
  // LIQUIDITY (monthly series)
  // ------------------------
  const months = (income.length && income.map(r => r.Month)) || (balance.length && balance.map(r => r.Month)) || [];
  const workingCapitalSeries = Array.isArray(balance) ? balance.map(b => WC.workingCapital([b])) : [];
  const currentRatioSeries = Array.isArray(balance) ? balance.map(b => WC.currentRatio([b])) : [];
  const quickRatioSeries = Array.isArray(balance) ? balance.map(b => WC.quickRatio([b])) : [];

  const latestBalance = balance.length ? balance[balance.length - 1] : {};
  const liquidity = {
    series: {
      workingCapital: workingCapitalSeries,
      currentRatio: currentRatioSeries,
      quickRatio: quickRatioSeries,
      months
    },
    latest: {
      workingCapital: workingCapitalSeries.at(-1) || 0,
      currentRatio: currentRatioSeries.at(-1) || 0,
      quickRatio: quickRatioSeries.at(-1) || 0
    },
    components: {
      latest: {
        Cash: Number(latestBalance.Cash || latestBalance.cash || 0),
        Accounts_Receivable: Number(latestBalance.Accounts_Receivable || latestBalance['Accounts Receivable'] || 0),
        Current_Liabilities: Number(latestBalance.Current_Liabilities || latestBalance.Accounts_Payable || 0)
      }
    }
  };

  // ------------------------
  // PROFITABILITY (series)
  // ------------------------
  const profSeries = Profit.buildProfitabilityEngine(income, balance);
  const profitability = {
    series: {
      grossMargin: profSeries.grossMargin || [],
      operatingMargin: profSeries.operatingMargin || [],
      netMargin: profSeries.netMargin || [],
      roic: profSeries.roic || [],
      months
    },
    latest: {
      grossMargin: (profSeries.grossMargin || []).at(-1) || 0,
      operatingMargin: (profSeries.operatingMargin || []).at(-1) || 0,
      netMargin: (profSeries.netMargin || []).at(-1) || 0,
      roic: (profSeries.roic || []).at(-1) || 0
    }
  };

  // ------------------------
  // VALUATION
  // ------------------------
  // Use valuation engine helpers defensively (handles multiple CSV key variants)
  const fcfSeries = Valuation.freeCashFlowSeries(cashflow || []);
  const dcfValue = Valuation.discountedCashFlow(fcfSeries || []);

  // build a DCF series: for each month, discount the remaining future FCFs to present at that month
  const discountRateAnnual = 0.12;
  const discountRateMonthly = Math.pow(1 + discountRateAnnual, 1 / 12) - 1;
  const dcfSeries = (fcfSeries || []).map((_, i) => {
    return (fcfSeries || []).slice(i).reduce((acc, cf, j) => acc + (Number(cf) || 0) / Math.pow(1 + discountRateMonthly, j + 1), 0);
  });

  const valuation = {
    series: { freeCashFlow: fcfSeries, dcfSeries, months },
    latest: { freeCashFlow: fcfSeries.at(-1) || 0, discountedCF: dcfSeries.at(-1) || 0 }
  };

  // ------------------------
  // OPERATING LEVERAGE
  // ------------------------
  // OPERATING LEVERAGE: compute DOL series using EBIT change / revenue change (with safety)
  const ebitSeries = income.map(r => Number(r.Gross_Profit || 0) - Number(r.Operating_Expenses || 0));
  const revenueSeries = income.map(r => Number(r.Revenue || 0));
  const dolSeries = revenueSeries.map((rev, i) => {
    if (i === 0) return 0;
    const revGrowth = (rev - (revenueSeries[i - 1] || 0)) / (Math.abs(revenueSeries[i - 1]) || 1);
    const ebitGrowth = (ebitSeries[i] - (ebitSeries[i - 1] || 0)) / (Math.abs(ebitSeries[i - 1]) || 1);
    if (!isFinite(revGrowth) || revGrowth === 0) return 0;
    return ebitGrowth / revGrowth;
  });

  const operatingLeverage = {
    series: { degreeOfOperatingLeverage: dolSeries, months },
    latest: { degreeOfOperatingLeverage: dolSeries.at(-1) || 0 }
  };

  // ------------------------
  // CAPITAL STRUCTURE
  // ------------------------
  const debtToEquitySeries = balance.map(b => (Number(b.Loans || 0) + Number(b.Accounts_Payable || 0)) / (Number(b.Equity || 1)));
  const equityRatioSeries = balance.map(b => Number(b.Equity || 0) / (Number(b.Total_Assets || 1)));
  const capitalStructure = {
    series: { debtToEquity: debtToEquitySeries, equityRatio: equityRatioSeries, months },
    latest: { debtToEquity: debtToEquitySeries.at(-1) || 0, equityRatio: equityRatioSeries.at(-1) || 0 }
  };

  // ------------------------
  // EFFICIENCY
  // ------------------------
  const receivablesTurnoverSeries = income.map((r, i) => Number(r.Revenue || 0) / (Number((balance[i] && balance[i].Accounts_Receivable) || 1)));
  const assetTurnoverSeries = income.map((r, i) => Number(r.Revenue || 0) / (Number((balance[i] && balance[i].Total_Assets) || 1)));
  const efficiency = {
    series: { receivablesTurnover: receivablesTurnoverSeries, assetTurnover: assetTurnoverSeries, months },
    latest: { receivablesTurnover: receivablesTurnoverSeries.at(-1) || 0, assetTurnover: assetTurnoverSeries.at(-1) || 0 }
  };

  return {
    datasets: { income, balance, cashflow },
    liquidity,
    profitability,
    valuation,
    operatingLeverage,
    capitalStructure,
    efficiency
  };
}

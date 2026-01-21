// workingCapital.js
import { safeNumber } from "./core.js";

/*
Working Capital Metrics:
- Working Capital
- Current Ratio
- Quick Ratio
- Cash Conversion Cycle
*/

export function workingCapital(balanceSheet) {
  const latest = Array.isArray(balanceSheet) && balanceSheet.length ? balanceSheet[balanceSheet.length - 1] : {};

  // Support a few common naming variants from CSVs
  const get = (obj, keys) => keys.map(k => obj?.[k]).find(v => v !== undefined);

  const cash = get(latest, ['Cash', 'cash', 'Cash_Balance']) || 0;
  const ar = get(latest, ['Accounts_Receivable', 'Accounts Receivable', 'AccountsReceivable', 'AR']) || 0;
  const ap = get(latest, ['Accounts_Payable', 'Accounts Payable', 'AccountsPayable', 'AP']) || 0;
  const loans = get(latest, ['Loans', 'Debt', 'Total_Debt']) || 0;
  const currentAssets = safeNumber(cash) + safeNumber(ar);
  const currentLiabilities = safeNumber(ap) + safeNumber(loans) + safeNumber(latest.Current_Liabilities || latest.CurrentLiability || 0);

  return currentAssets - currentLiabilities;
}

export function currentRatio(balanceSheet) {
  const latest = Array.isArray(balanceSheet) && balanceSheet.length ? balanceSheet[balanceSheet.length - 1] : {};
  const get = (obj, keys) => keys.map(k => obj?.[k]).find(v => v !== undefined);
  const cash = get(latest, ['Cash', 'cash', 'Cash_Balance']) || 0;
  const ar = get(latest, ['Accounts_Receivable', 'Accounts Receivable', 'AccountsReceivable', 'AR']) || 0;
  const ap = get(latest, ['Accounts_Payable', 'Accounts Payable', 'AccountsPayable', 'AP']) || 0;
  const loans = get(latest, ['Loans', 'Debt', 'Total_Debt']) || 0;
  const currentAssets = safeNumber(cash) + safeNumber(ar);
  const currentLiabilities = safeNumber(ap) + safeNumber(loans) + safeNumber(latest.Current_Liabilities || 0);
  return currentAssets / (currentLiabilities || 1);
}

export function quickRatio(balanceSheet) {
  const latest = Array.isArray(balanceSheet) && balanceSheet.length ? balanceSheet[balanceSheet.length - 1] : {};
  const get = (obj, keys) => keys.map(k => obj?.[k]).find(v => v !== undefined);
  const cash = get(latest, ['Cash', 'cash', 'Cash_Balance']) || 0;
  const ar = get(latest, ['Accounts_Receivable', 'Accounts Receivable', 'AccountsReceivable', 'AR']) || 0;
  const quickAssets = safeNumber(cash) + safeNumber(ar);
  const currentLiabilities = get(latest, ['Current_Liabilities', 'Current Liabilities', 'CurrentLiability']) || 1;
  return quickAssets / safeNumber(currentLiabilities || 1);
}

export function cashConversionCycle({ dso, dio, dpo }) {
  return dso + dio - dpo;
}

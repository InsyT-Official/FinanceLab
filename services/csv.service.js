const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.readFileSync(filePath, 'utf8');

    parse(file, { columns: true, trim: true }, (err, records) => {
      if (err) reject(err);
      else resolve(records);
    });
  });
}

async function loadFinancialData(company) {
  const basePath = path.join(__dirname, '../data', company);

  const incomeStatement = await parseCSV(
    path.join(basePath, 'pinelands_income_statement.csv')
  );

  const cashFlow = await parseCSV(
    path.join(basePath, 'pinelands_cash_flow.csv')
  );

  const balanceSheet = await parseCSV(
    path.join(basePath, 'pinelands_balance_sheet.csv')
  );

  const dataset = { incomeStatement, cashFlow, balanceSheet };

  // Enhance dataset with computed columns (mirrors client-side enhancements)
  try {
    enhanceDatasets(dataset);
  } catch (err) {
    console.warn('enhanceDatasets error (server):', err);
  }

  return dataset;
}

function enhanceDatasets(dataset) {
  if (!dataset) return;
  const income = dataset.incomeStatement || [];
  const cashflow = dataset.cashFlow || [];
  const balance = dataset.balanceSheet || [];

  const incomeByMonth = {};
  income.forEach(r => { if (r && r.Month) incomeByMonth[r.Month] = r; });

  for (let i = 0; i < income.length; i++) {
    const row = income[i];
    const rev = Number(row.Revenue || 0);
    const gross = Number(row.Gross_Profit || 0);
    const opex = Number(row.Operating_Expenses || 0);
    const net = Number(row.Net_Income || 0);

    row.Gross_Margin_pct = rev ? (gross / rev) * 100 : 0;
    row.Operating_Margin_pct = rev ? ((gross - opex) / rev) * 100 : 0;
    row.Net_Margin_pct = rev ? (net / rev) * 100 : 0;

    if (i === 0) {
      row.Revenue_Growth_pct = 0;
      row.Net_Income_Growth_pct = 0;
    } else {
      const prevRev = Number(income[i - 1].Revenue || 0);
      const prevNet = Number(income[i - 1].Net_Income || 0);
      row.Revenue_Growth_pct = prevRev ? ((rev - prevRev) / Math.abs(prevRev)) * 100 : 0;
      row.Net_Income_Growth_pct = prevNet ? ((net - prevNet) / Math.abs(prevNet)) * 100 : 0;
    }
  }

  for (let i = 0; i < balance.length; i++) {
    const row = balance[i];
    const cash = Number(row.Cash || 0);
    const ar = Number(row.Accounts_Receivable || 0);
    const ap = Number(row.Accounts_Payable || 0);
    const loans = Number(row.Loans || 0);
    const equity = Number(row.Equity || 0);
    const totalAssets = Number(row.Total_Assets || 0);

    row.Current_Assets = cash + ar;
    row.Current_Liabilities = ap;
    row.Working_Capital = row.Current_Assets - row.Current_Liabilities;
    row.Total_Debt = ap + loans;
    row.Debt_to_Equity = equity ? (row.Total_Debt / equity) : 0;

    if (i === 0) {
      row.MoM_Change_Total_Assets_pct = 0;
    } else {
      const prev = Number(balance[i - 1].Total_Assets || 0);
      row.MoM_Change_Total_Assets_pct = prev ? ((totalAssets - prev) / Math.abs(prev)) * 100 : 0;
    }
  }

  let cumulative = 0;
  for (let i = 0; i < cashflow.length; i++) {
    const row = cashflow[i];
    const cfo = Number(row.Cash_From_Operations || 0);
    const cfi = Number(row.Cash_From_Investing || 0);
    const netCash = Number(row.Net_Cash_Flow || 0);

    cumulative += netCash;
    row.Cumulative_Cash = cumulative;

    const capexApprox = Math.max(0, -cfi);
    row.Free_Cash_Flow = cfo - capexApprox;

    const incomeRow = incomeByMonth[row.Month] || {};
    const netIncome = Number(incomeRow.Net_Income || 0);
    const revenue = Number(incomeRow.Revenue || 0);

    row.OCF_to_Net_Income_pct = netIncome ? (cfo / netIncome) * 100 : 0;
    row.FCF_to_Revenue_pct = revenue ? (row.Free_Cash_Flow / revenue) * 100 : 0;
  }
}

module.exports = { loadFinancialData };

// core.js
// Financial engine core utilities (time-series first)


// -----------------------------
// NUMBER SAFETY
// -----------------------------
export function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}


// -----------------------------
// ROW UTILITIES
// -----------------------------
export function pick(row, key) {
  if (!row || typeof row !== "object") return 0;
  return safeNumber(row[key]);
}


// -----------------------------
// ARRAY AGGREGATES
// -----------------------------
export function sum(rows = [], key) {
  return rows.reduce((total, row) => total + pick(row, key), 0);
}

export function average(rows = [], key) {
  if (!rows.length) return 0;
  return sum(rows, key) / rows.length;
}

export function latest(rows = [], key) {
  if (!rows.length) return 0;
  return pick(rows[rows.length - 1], key);
}


// -----------------------------
// SERIES BUILDERS
// -----------------------------
export function series(rows = [], builder) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row, i) => builder(row, i, rows));
}

export function getSeries(rows = [], key) {
  return rows.map(r => pick(r, key));
}

export function getLabels(rows = [], labelKey = "Month") {
  return rows.map(r => r?.[labelKey] ?? "");
}


// -----------------------------
// FINANCIAL MATH
// -----------------------------
export function growthRate(current, previous) {
  const c = safeNumber(current);
  const p = safeNumber(previous);
  if (p === 0) return 0;
  return (c - p) / Math.abs(p);
}

export function margin(part, total) {
  const t = safeNumber(total);
  if (t === 0) return 0;
  return safeNumber(part) / t;
}


// -----------------------------
// TIME-SERIES HELPERS
// -----------------------------
export function deltaSeries(rows = [], key) {
  return rows.map((r, i) => {
    if (i === 0) return 0;
    return safeNumber(r[key]) - safeNumber(rows[i - 1][key]);
  });
}

export function growthSeries(rows = [], key) {
  return rows.map((r, i) => {
    if (i === 0) return 0;
    return growthRate(r[key], rows[i - 1][key]);
  });
}

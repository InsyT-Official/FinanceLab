import { runFinanceEngine } from "./finance.engine.js";
import { STANDARDS } from "./standards.js";
import { generateNarrative } from "./narratives.js";

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------
  // GLOBAL STATE
  // -------------------------------
  let charts = {};
  const EDITABLE_COLUMNS = {
    income: ["Revenue", "Cost_of_Goods_Sold", "Operating_Expenses"],
    cashflow: ["Cash_From_Operations", "Cash_From_Investing", "Cash_From_Financing"],
    balance: ["Cash", "Accounts_Receivable", "Equipment", "Accounts_Payable", "Loans", "Equity"]
  };
 
  if (!window.companyName) window.companyName = null;

  const sidebarCompanyLabel = document.getElementById("sidebar-company-name");
  const dashboardTitle = document.getElementById("dashboard-title");
  const dashboardContent = document.getElementById("dashboard-content");
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");

  // ================= AI CHAT STATE =================
  const aiChatModal = document.getElementById("aiChatModal");
  const aiChatBtn = document.getElementById("aiChatBtn");
  const closeChatBtn = document.getElementById("closeChatBtn");
  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");
  const chatMessages = document.getElementById("chatMessages");
  const chatLoading = document.getElementById("chatLoading");

  // ================= AI CHAT FUNCTIONS =================
  function openChat() {
    aiChatModal.removeAttribute('hidden');
    chatInput.focus();
  }

  function closeChat() {
    aiChatModal.setAttribute('hidden', '');
  }

  function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user-message' : 'ai-message'}`;
    const formattedText = formatMessageText(text);
    messageDiv.innerHTML = formattedText;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function formatMessageText(text) {
    // Escape HTML first
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Convert markdown-style formatting
    // Headers: ## becomes <h3>
    html = html.replace(/^### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2>$1</h2>');

    // Bold: **text** becomes <strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text* becomes <em>
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br/>');

    // Bullet points
    html = html.replace(/^• (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');

    // Numbered lists
    html = html.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');

    // Wrap in paragraph
    html = `<p>${html}</p>`;

    return html;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    if (!window.companyName) {
      addMessage('Please load a company dataset first.', false);
      return;
    }

    // Add user message
    addMessage(message, true);
    chatInput.value = '';

    // Show loading
    chatLoading.removeAttribute('hidden');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          type: 'question',
          company: window.companyName,
          financeData: window.financeData
        })
      });

      const data = await response.json();

      if (response.ok) {
        addMessage(data.response, false);
      } else {
        addMessage(`Error: ${data.error}`, false);
      }
    } catch (error) {
      addMessage(`Error: ${error.message}`, false);
    } finally {
      chatLoading.setAttribute('hidden', '');
      chatInput.focus();
    }
  }

  // ================= AI CHAT EVENT LISTENERS =================
  aiChatBtn?.addEventListener('click', openChat);
  closeChatBtn?.addEventListener('click', closeChat);
  chatSendBtn?.addEventListener('click', sendMessage);
  chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Close modal when clicking outside
  aiChatModal?.addEventListener('click', (e) => {
    if (e.target === aiChatModal) closeChat();
  });

  // ================= PDF DOWNLOAD =================
  downloadPdfBtn?.addEventListener('click', downloadDashboardPdf);

  async function downloadDashboardPdf() {
    if (!window.companyName) {
      alert('Please load a company dataset first.');
      return;
    }

    downloadPdfBtn.disabled = true;
    downloadPdfBtn.textContent = '⏳ Generating PDF...';

    try {
      // Clone the dashboard element
      const dashboardClone = document.querySelector('.dashboard').cloneNode(true);
      
      // Convert all canvas elements to images
      const canvases = document.querySelectorAll('.dashboard canvas');
      const cloneCanvases = dashboardClone.querySelectorAll('canvas');
      
      canvases.forEach((canvas, index) => {
        if (cloneCanvases[index]) {
          // Get the canvas as an image data URL
          const imageData = canvas.toDataURL('image/png');
          
          // Create an img element
          const img = document.createElement('img');
          img.src = imageData;
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.marginTop = '20px';
          img.style.marginBottom = '20px';
          
          // Replace the canvas with the image
          cloneCanvases[index].parentNode.replaceChild(img, cloneCanvases[index]);
        }
      });
      
      // Get the modified HTML
      const dashboardHtml = dashboardClone.innerHTML;

      const response = await fetch('/report/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: window.companyName,
          financeData: window.financeData,
          dashboardHtml: dashboardHtml
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${window.companyName.replace(/\s+/g, '-').toLowerCase()}-report.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const error = await response.json();
        alert('Error generating PDF: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Error generating PDF: ' + error.message);
    } finally {
      downloadPdfBtn.disabled = false;
      downloadPdfBtn.textContent = '📥 Download PDF';
    }
  }

  function updateCompanyNameUI(name) {
    if (sidebarCompanyLabel) sidebarCompanyLabel.textContent = name || "No Dataset Loaded";
    if (dashboardTitle) dashboardTitle.textContent = name ? `${name} – Financial Overview` : "No Dataset Loaded";
  }

  updateCompanyNameUI(window.companyName);

  // store original snapshot for scenario reset
  if (!window._originalFinanceData) {
    window._originalFinanceData = window.financeData ? JSON.parse(JSON.stringify(window.financeData)) : null;
  }

  // -------------------------------
  // SMOOTH SCROLLING
  // -------------------------------
  document.querySelectorAll('.sidebar a[href^="#"]').forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const target = link.dataset.target || (link.getAttribute("href") || "").replace(/^#/, "");
      // render the target metric in the main panel
      try { renderSection(target); } catch (err) { console.warn('renderSection error', err); }
      // then smooth-scroll to the section (if exists)
      smoothScrollTo(document.querySelector(link.getAttribute("href")));
    });
  });

  // -------------------------------
  // COLLAPSIBLE NAV SECTIONS
  // -------------------------------
  document.querySelectorAll('.nav-section.collapsible > h4').forEach(h => {
    h.addEventListener('click', () => {
      const container = h.parentElement;
      const subs = container.querySelector('.sub-items');
      if (!subs) return;
      const isHidden = subs.hasAttribute('hidden');
      if (isHidden) {
        subs.removeAttribute('hidden');
        container.classList.add('open');
      } else {
        subs.setAttribute('hidden', '');
        container.classList.remove('open');
      }
    });
  });

  function smoothScrollTo(target) {
    if (!target) return;
    const start = window.pageYOffset;
    const end = target.getBoundingClientRect().top + start;
    const duration = 1750;
    let startTime = null;

    function animate(time) {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const ease = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      window.scrollTo(0, start + (end - start) * ease);
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

  // -------------------------------
  // OPEN DATASET
  // -------------------------------
  document.getElementById("openDatasetBtn")?.addEventListener("click", openDataset);

  function openDataset() {
    const input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;
    input.multiple = true;
    input.accept = ".csv";

    input.addEventListener("change", async () => {
      const files = Array.from(input.files);
      if (files.length) {
        const folderName = files[0].webkitRelativePath.split("/")[0];
        window.companyName = formatCompanyName(folderName);
        updateCompanyNameUI(window.companyName);
        await loadDatasetFromFiles(files);
      }
    });

    input.click();
  }

  function formatCompanyName(folderName) {
    return folderName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // -------------------------------
  // DATASET LOADER
  // -------------------------------
  async function loadDatasetFromFiles(files) {
    const dataset = {
      incomeStatement: [],
      cashFlow: [],
      balanceSheet: []
    };

    for (const file of files) {
      const name = file.name.toLowerCase();
      if (name.includes("income") && name.includes("statement")) dataset.incomeStatement = await parseCSV(file);
      if (name.includes("cashflow") || name.includes("cash_flow")) dataset.cashFlow = await parseCSV(file);
      if (name.includes("balance") && name.includes("sheet")) dataset.balanceSheet = await parseCSV(file);
    }

    // attach computed columns (enhance rows) before rendering
    try { enhanceDatasets(dataset); } catch (err) { console.warn('enhanceDatasets error', err); }

    // save original snapshot for scenario simulation
    window._originalFinanceData = JSON.parse(JSON.stringify(dataset));

    window.financeData = dataset;
    // Render UI and analysis, then narrative
    renderAll();
    runAnalysis();
    try { renderNarrative(window.financeData); } catch (err) { console.warn('renderNarrative error', err); }
  }

  // -------------------------------
  // CSV PARSER
  // -------------------------------
  function parseCSV(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const lines = reader.result.split("\n").filter(Boolean);
        const headers = lines[0].split(",").map(h => h.trim());
        const rows = lines.slice(1).map(line => {
          const values = line.split(",");
          const row = {};
          headers.forEach((h, i) => row[h] = values[i]?.trim());
          return row;
        });
        resolve(rows);
      };
      reader.readAsText(file);
    });
  }

  // -------------------------------
  // DATA ENHANCEMENT (computed columns)
  // -------------------------------
  function enhanceDatasets(dataset) {
    if (!dataset) return;
    const income = dataset.incomeStatement || [];
    const cashflow = dataset.cashFlow || [];
    const balance = dataset.balanceSheet || [];

    // Build quick lookup for income rows by Month
    const incomeByMonth = {};
    income.forEach(r => { if (r && r.Month) incomeByMonth[r.Month] = r; });

    // Enhance Income Statement
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

    // Enhance Balance Sheet
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

    // Enhance Cash Flow
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

      // Cross-reference income statement for ratios
      const incomeRow = incomeByMonth[row.Month] || {};
      const netIncome = Number(incomeRow.Net_Income || 0);
      const revenue = Number(incomeRow.Revenue || 0);

      row.OCF_to_Net_Income_pct = netIncome ? (cfo / netIncome) * 100 : 0;
      row.FCF_to_Revenue_pct = revenue ? (row.Free_Cash_Flow / revenue) * 100 : 0;
    }
  }

  // -------------------------------
  // CHART HELPERS
  // -------------------------------
  const getLabels = rows => rows.map(r => r.Month);
  const getValues = (rows, key) => rows.map(r => Number(r[key]) || 0);

  const baseOptions = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { position: "top", labels: { color: "#fff" } } },
    scales: {
      x: { ticks: { color: "#fff" } },
      y: { ticks: { color: "#fff" }, beginAtZero: true }
    }
  };

  function destroyChart(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  }

  // -------------------------------
  // RENDER TABLES + CHARTS
  // -------------------------------
  function renderAll() {
    dashboardContent.innerHTML = "";

    renderTableSection("Income Statement", "income", window.financeData.incomeStatement, ["Month", "Revenue", "Cost_of_Goods_Sold", "Gross_Profit", "Operating_Expenses", "Net_Income"]);
    renderTableSection("Cash Flow Statement", "cashflow", window.financeData.cashFlow, ["Month", "Cash_From_Operations", "Cash_From_Investing", "Cash_From_Financing", "Net_Cash_Flow"]);
    renderTableSection("Balance Sheet", "balance", window.financeData.balanceSheet, ["Month", "Cash", "Accounts_Receivable", "Equipment", "Total_Assets", "Accounts_Payable", "Loans", "Equity"]);
  }

  function renderTableSection(title, id, rows, columns) {
    const section = document.createElement("section");
    section.id = id;
    section.className = "statement";

    const h3 = document.createElement("h3");
    h3.textContent = title;
    // actions container (export)
    const actions = document.createElement('div');
    actions.className = 'section-actions';
    const exportBtn = document.createElement('button');
    exportBtn.className = 'export-csv-btn';
    exportBtn.textContent = 'Export CSV';
    exportBtn.addEventListener('click', () => exportTableToCSV(rows, `${id}.csv`));
    actions.appendChild(exportBtn);
    section.appendChild(h3);
    section.appendChild(actions);

    // Table
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    columns.forEach(col => {
      const th = document.createElement("th");
      th.textContent = col.replace(/_/g, " ");
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rows.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      columns.forEach(col => {
        const td = document.createElement("td");
        td.className = "number";
        const isEditable = EDITABLE_COLUMNS[id] && EDITABLE_COLUMNS[id].includes(col);
        const raw = row[col] ?? "0";
        td.textContent = raw;
        if (isEditable) {
          td.contentEditable = true;
          td.classList.add('editable-cell');
          td.dataset.rowIndex = rowIndex;
          td.dataset.col = col;
          td.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              td.blur();
            }
          });
          td.addEventListener('blur', () => {
            saveEditedCell(id, Number(td.dataset.rowIndex), td.dataset.col, td.textContent.trim());
          });
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    section.appendChild(table);

    // Chart
    const canvas = document.createElement("canvas");
    canvas.id = id + "Chart";
    section.appendChild(canvas);

    dashboardContent.appendChild(section);

    renderChart(id, rows, columns);
  }

  function renderChart(id, rows, columns) {
    const el = document.getElementById(id + "Chart");
    if (!el || !rows.length) return;

    destroyChart(id);

    // Define neon style per chart
    let datasets = [];
    const neonColors = {
      income: ["#00ffff", "#ff00ff"],
      cashflow: ["#00ff00", "#ff9900"],
      balance: ["#00ffff", "#ff00ff"]
    };

    if (id === "income") {
      datasets = [
        {
          label: "Revenue",
          data: getValues(rows, "Revenue"),
          borderColor: neonColors.income[0],
          backgroundColor: "rgba(0,255,255,0.2)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: neonColors.income[0],
          pointBorderColor: "#fff",
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 3
        },
        {
          label: "Net Income",
          data: getValues(rows, "Net_Income"),
          borderColor: neonColors.income[1],
          backgroundColor: "rgba(255,0,255,0.2)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: neonColors.income[1],
          pointBorderColor: "#fff",
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 3
        }
      ];
    } else if (id === "cashflow") {
      datasets = [
        {
          label: "Operating Cash Flow",
          data: getValues(rows, "Cash_From_Operations"),
          borderColor: neonColors.cashflow[0],
          backgroundColor: "rgba(0,255,0,0.2)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: neonColors.cashflow[0],
          pointBorderColor: "#fff",
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 3
        },
        {
          label: "Net Cash Flow",
          data: getValues(rows, "Net_Cash_Flow"),
          borderColor: neonColors.cashflow[1],
          backgroundColor: "rgba(255,153,0,0.2)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: neonColors.cashflow[1],
          pointBorderColor: "#fff",
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 3
        }
      ];
    } else if (id === "balance") {
      datasets = [
        {
          label: "Total Assets",
          data: getValues(rows, "Total_Assets"),
          borderColor: neonColors.balance[0],
          backgroundColor: "rgba(0,255,255,0.2)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: neonColors.balance[0],
          pointBorderColor: "#fff",
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 3
        },
        {
          label: "Equity",
          data: getValues(rows, "Equity"),
          borderColor: neonColors.balance[1],
          backgroundColor: "rgba(255,0,255,0.2)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: neonColors.balance[1],
          pointBorderColor: "#fff",
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 3
        }
      ];
    }

    charts[id] = new Chart(el, {
      type: "line",
      data: { labels: getLabels(rows), datasets },
      options: baseOptions
    });
  }

  // Save edited cell back into dataset and recalc
  function saveEditedCell(tableId, rowIndex, colKey, newValue) {
      const dataset = window.financeData || { incomeStatement: [], cashFlow: [], balanceSheet: [] };
      let rows;
      if (tableId === 'income') rows = dataset.incomeStatement;
      else if (tableId === 'cashflow') rows = dataset.cashFlow;
      else if (tableId === 'balance') rows = dataset.balanceSheet;
      if (!rows || !rows[rowIndex]) return;
      // sanitize numeric input (allow negative, decimals)
      const clean = String(newValue).replace(/[^0-9.\-]/g, '');
      rows[rowIndex][colKey] = clean;

      // Recompute derived columns and rerender everything
      try { enhanceDatasets(dataset); } catch (err) { console.warn('enhanceDatasets error', err); }
      window.financeData = dataset;
      renderAll();
      runAnalysis();
        if (!dataset) return;
        const income = dataset.incomeStatement || [];
        const cashflow = dataset.cashFlow || [];
        const balance = dataset.balanceSheet || [];

        // build month-indexed maps to align rows across statements
        const incomeByMonth = {};
        income.forEach((r, i) => { if (r && r.Month) incomeByMonth[r.Month] = { row: r, i }; });
        const cashByMonth = {};
        cashflow.forEach((r, i) => { if (r && r.Month) cashByMonth[r.Month] = { row: r, i }; });
        const balanceByMonth = {};
        balance.forEach((r, i) => { if (r && r.Month) balanceByMonth[r.Month] = { row: r, i }; });

        // ------------------
        // Recompute Income Statement derived fields
        // ------------------
        for (let i = 0; i < income.length; i++) {
          const row = income[i];
          const rev = Number(String(row.Revenue || '0').replace(/[^0-9.\-]/g, '')) || 0;
          const cogs = Number(String(row.Cost_of_Goods_Sold || row.Cost_of_Goods_Sold || 0).replace(/[^0-9.\-]/g, '')) || 0;
          const opex = Number(String(row.Operating_Expenses || 0).replace(/[^0-9.\-]/g, '')) || 0;

          const gross = rev - cogs;
          const net = gross - opex;

          row.Gross_Profit = Number.isFinite(gross) ? gross : 0;
          row.Net_Income = Number.isFinite(net) ? net : 0;

          row.Gross_Margin_pct = rev ? (row.Gross_Profit / rev) * 100 : 0;
          row.Operating_Margin_pct = rev ? ((row.Gross_Profit - opex) / rev) * 100 : 0;
          row.Net_Margin_pct = rev ? (row.Net_Income / rev) * 100 : 0;

          if (i === 0) {
            row.Revenue_Growth_pct = 0;
            row.Net_Income_Growth_pct = 0;
          } else {
            const prevRev = Number(String(income[i - 1].Revenue || '0').replace(/[^0-9.\-]/g, '')) || 0;
            const prevNet = Number(income[i - 1].Net_Income || 0) || 0;
            row.Revenue_Growth_pct = prevRev ? ((rev - prevRev) / Math.abs(prevRev)) * 100 : 0;
            row.Net_Income_Growth_pct = prevNet ? ((row.Net_Income - prevNet) / Math.abs(prevNet)) * 100 : 0;
          }
        }

        // ------------------
        // Recompute Cash Flow derived fields
        // ------------------
        // We'll derive Cash_From_Operations from Net Income (simple proxy), then compute Net_Cash_Flow and cumulative cash
        let cumulativeCashFromFlows = 0;
        for (let i = 0; i < cashflow.length; i++) {
          const row = cashflow[i];
          const month = row.Month;
          const incomeRow = (incomeByMonth[month] && incomeByMonth[month].row) || {};
          const netIncome = Number(incomeRow.Net_Income || 0);

          // set CFO to net income as a simple working model
          row.Cash_From_Operations = netIncome;
          const cfi = Number(String(row.Cash_From_Investing || 0).replace(/[^0-9.\-]/g, '')) || 0;
          const cff = Number(String(row.Cash_From_Financing || 0).replace(/[^0-9.\-]/g, '')) || 0;

          row.Net_Cash_Flow = row.Cash_From_Operations + cfi + cff;

          cumulativeCashFromFlows += Number(row.Net_Cash_Flow || 0);
          row.Cumulative_Cash = cumulativeCashFromFlows;

          // Free cash flow as before: CFO - approx capex
          const capexApprox = Math.max(0, -cfi);
          row.Free_Cash_Flow = row.Cash_From_Operations - capexApprox;

          // ratios referencing income
          const revenue = Number((incomeRow.Revenue || 0));
          row.OCF_to_Net_Income_pct = netIncome ? (row.Cash_From_Operations / netIncome) * 100 : 0;
          row.FCF_to_Revenue_pct = revenue ? (row.Free_Cash_Flow / revenue) * 100 : 0;
        }

        // ------------------
        // Recompute Balance Sheet derived fields and propagate Cash from cashflow
        // ------------------
        // If balance and cashflow share months, propagate cash balances from running flows, using balance[0].Cash as base
        if (balance.length && cashflow.length) {
          // ensure numeric Cash in first row
          balance[0].Cash = Number(String(balance[0].Cash || 0).replace(/[^0-9.\-]/g, '')) || 0;
          for (let i = 0; i < balance.length; i++) {
            const row = balance[i];
            // attempt to align by index; if months align, use cashflow's cumulative change
            if (i > 0 && cashflow[i]) {
              const prevCash = Number(balance[i - 1].Cash || 0);
              const netFlow = Number(cashflow[i].Net_Cash_Flow || 0);
              row.Cash = prevCash + netFlow;
            } else {
              row.Cash = Number(String(row.Cash || 0).replace(/[^0-9.\-]/g, '')) || 0;
            }

            const cash = Number(row.Cash || 0);
            const ar = Number(String(row.Accounts_Receivable || 0).replace(/[^0-9.\-]/g, '')) || 0;
            const equip = Number(String(row.Equipment || 0).replace(/[^0-9.\-]/g, '')) || 0;
            const ap = Number(String(row.Accounts_Payable || 0).replace(/[^0-9.\-]/g, '')) || 0;
            const loans = Number(String(row.Loans || 0).replace(/[^0-9.\-]/g, '')) || 0;

            row.Total_Assets = cash + ar + equip;
            const totalLiab = ap + loans;
            row.Equity = row.Total_Assets - totalLiab;

            row.Current_Assets = cash + ar;
            row.Current_Liabilities = ap;
            row.Working_Capital = row.Current_Assets - row.Current_Liabilities;
            row.Total_Debt = ap + loans;
            row.Debt_to_Equity = Number(row.Equity) ? (row.Total_Debt / Number(row.Equity)) : 0;

            if (i === 0) {
              row.MoM_Change_Total_Assets_pct = 0;
            } else {
              const prev = Number(balance[i - 1].Total_Assets || 0);
              row.MoM_Change_Total_Assets_pct = prev ? ((row.Total_Assets - prev) / Math.abs(prev)) * 100 : 0;
            }
          }
        } else {
          // fallback: compute using only balance rows
          for (let i = 0; i < balance.length; i++) {
            const row = balance[i];
            const cash = Number(String(row.Cash || 0).replace(/[^0-9.\-]/g, '')) || 0;
            const ar = Number(String(row.Accounts_Receivable || 0).replace(/[^0-9.\-]/g, '')) || 0;
            const equip = Number(String(row.Equipment || 0).replace(/[^0-9.\-]/g, '')) || 0;
            const ap = Number(String(row.Accounts_Payable || 0).replace(/[^0-9.\-]/g, '')) || 0;
            const loans = Number(String(row.Loans || 0).replace(/[^0-9.\-]/g, '')) || 0;

            row.Total_Assets = cash + ar + equip;
            const totalLiab = ap + loans;
            row.Equity = row.Total_Assets - totalLiab;

            row.Current_Assets = cash + ar;
            row.Current_Liabilities = ap;
            row.Working_Capital = row.Current_Assets - row.Current_Liabilities;
            row.Total_Debt = ap + loans;
            row.Debt_to_Equity = Number(row.Equity) ? (row.Total_Debt / Number(row.Equity)) : 0;

            if (i === 0) {
              row.MoM_Change_Total_Assets_pct = 0;
            } else {
              const prev = Number(balance[i - 1].Total_Assets || 0);
              row.MoM_Change_Total_Assets_pct = prev ? ((row.Total_Assets - prev) / Math.abs(prev)) * 100 : 0;
            }
          }
        }
    // compute revenue series and month-over-month absolute pct changes for volatility
    const revs = income.map(r => Number(String(r.Revenue || 0).replace(/[^0-9.\-]/g, '')) || 0);
    const revPctChanges = [];
    for (let i = 1; i < revs.length; i++) {
      const prev = revs[i - 1];
      const cur = revs[i];
      const pct = prev ? ((cur - prev) / Math.abs(prev)) * 100 : 0;
      revPctChanges.push(Math.abs(pct));
    }

    const revenueVolatility = revPctChanges.length ? revPctChanges.reduce((a, b) => a + b, 0) / revPctChanges.length : 0;
    const revenueTrend = (revs.length >= 2) ? (((revs.at(-1) || 0) - (revs[0] || 0)) / (Math.abs(revs[0]) || 1)) * 100 : 0;

    // latest balance-derived ratios
    const latestBalance = balance.length ? balance[balance.length -1] : {};
    const currentAssets = Number(latestBalance.Current_Assets || latestBalance.Current_Assets || 0);
    const currentLiabilities = Number(latestBalance.Current_Liabilities || 0) || Number(latestBalance.Accounts_Payable || 0);
    const currentRatio = currentLiabilities ? (currentAssets / currentLiabilities) : 0;
    const debtToEquity = Number(latestBalance.Total_Debt || 0) / (Number(latestBalance.Equity || 1));

    // net income average and last
    const nets = income.map(r => Number(r.Net_Income || 0));
    const netIncomeAvg = nets.length ? nets.reduce((a,b)=>a+b,0)/nets.length : 0;
    const netIncomeLast = nets.length ? nets.at(-1) : 0;

    return {
      avgGrossMargin,
      revenueVolatility,
      revenueTrend,
      currentRatio,
      debtToEquity,
      netIncomeAvg,
      netIncomeLast
    };
  }

  function renderNarrative(dataset, title = 'Strategy & Narrative', sectionId = 'strategy') {
    ensureSectionExists(sectionId, title);
    const panel = document.getElementById(sectionId).querySelector('.analysis-content');
    if (!panel) return;
    const metrics = computeNarrativeMetrics(dataset || window.financeData || { incomeStatement: [], balanceSheet: [], cashFlow: [] });
    const narrative = generateNarrative({
      avgGrossMargin: metrics.avgGrossMargin,
      revenueVolatility: metrics.revenueVolatility,
      revenueTrend: metrics.revenueTrend,
      currentRatio: metrics.currentRatio,
      debtToEquity: metrics.debtToEquity,
      netIncomeAvg: metrics.netIncomeAvg
    }, STANDARDS);

    panel.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'statement';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const p = document.createElement('p');
    p.innerHTML = narrative;
    wrapper.appendChild(h3);
    wrapper.appendChild(p);
    panel.appendChild(wrapper);
    // clear any chart for narrative section
    destroyChart(sectionId);
  }

  // Map sidebar clicks to engine and UI rendering
  function renderSection(metric) {
    if (!metric) return;
    const engine = runFinanceEngine(window.financeData || { incomeStatement: [], balanceSheet: [], cashFlow: [] });
    // Known table views
    if (metric === 'income' || metric === 'cashflow' || metric === 'balance') {
      dashboardContent.innerHTML = '';
      if (metric === 'income') renderTableSection('Income Statement', 'income', window.financeData.incomeStatement, ["Month", "Revenue", "Cost_of_Goods_Sold", "Gross_Profit", "Operating_Expenses", "Net_Income"]);
      if (metric === 'cashflow') renderTableSection('Cash Flow Statement', 'cashflow', window.financeData.cashFlow, ["Month", "Cash_From_Operations", "Cash_From_Investing", "Cash_From_Financing", "Net_Cash_Flow"]);
      if (metric === 'balance') renderTableSection('Balance Sheet', 'balance', window.financeData.balanceSheet, ["Month", "Cash", "Accounts_Receivable", "Equipment", "Total_Assets", "Accounts_Payable", "Loans", "Equity"]);
      return;
    }

    // mapping of sidebar keys to engine outputs and display titles
    const mapping = {
      'profitability': ['profitability','Profitability & ROIC'],
      'efficiency': ['efficiency','Efficiency'],
      'operating-leverage': ['operatingLeverage','Operating Leverage'],
      'working-capital': ['liquidity','Working Capital'],
      'capital-structure': ['capitalStructure','Capital Structure'],
      'valuation': ['valuation','Valuation'],
      'free-cash-flow': ['valuation','Free Cash Flow'],
      'dcf-valuation': ['valuation','DCF Valuation'],
      'growth-drivers': ['profitability','Growth Drivers'],
      'growth': ['profitability','Growth & Reinvestment'],
      'liquidity': ['liquidity','Liquidity & Solvency'],
      'coverage': ['capitalStructure','Coverage & Safety'],
      'business-risk': ['operatingLeverage','Business Risk'],
      'financial-risk': ['capitalStructure','Financial Risk'],
      'cost-of-capital': ['valuation','Cost of Capital'],
      'scenario': ['valuation','Scenario Analysis'],
      'relative-valuation': ['valuation','Relative Valuation'],
      'scenario-valuation': ['valuation','Scenario Valuation'],
      'business-model': ['strategy','Business Model'],
      'unit-economics': ['strategy','Unit Economics'],
      'value-drivers': ['strategy','Value Drivers'],
      'story-vs-numbers': ['strategy','Story vs Numbers'],
      'investment-thesis': ['strategy','Investment Thesis']
    };

    const map = mapping[metric];
    const sectionId = metric;
    const title = map ? map[1] : (metric.replace(/[-_]/g, ' ') || metric);
    ensureSectionExists(sectionId, title);

    if (map && map[0] === 'strategy') {
      // Strategy & Narrative: generate and render narrative based on current dataset
      renderNarrative(window.financeData, title, sectionId);
      return;
    }

    if (map && engine[map[0]]) {
      // use existing analysis renderer to populate the section
      renderAnalysisSection(sectionId, engine[map[0]], title);
      return;
    }

    // If no engine data, show a small placeholder that still uses existing styles
    const section = document.getElementById(sectionId);
    if (!section) return;
    const panel = section.querySelector('.analysis-content');
    const canvas = document.getElementById(sectionId + 'Chart');
    if (panel) {
      panel.innerHTML = `<p class="muted">No pre-computed metric available for <strong>${title}</strong>. The engine ran but returned no series for this metric.</p>`;
    }
    if (canvas) {
      destroyChart(sectionId);
    }
  }
  function renderAnalysisSection(id, dataObj, title) {
    const section = document.getElementById(id);
    if (!section) return;
    const panel = section.querySelector('.analysis-content');
    const canvas = document.getElementById(id + 'Chart');
    if (!panel) return;

    panel.innerHTML = '';
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    // Prefer explicit latest numeric values, then fall back to last item of series,
    // then components.latest, then raw object values. This avoids Number(array) -> NaN.
    let displayObj = {};
    if (dataObj && dataObj.latest && typeof dataObj.latest === 'object') {
      displayObj = dataObj.latest;
    } else if (dataObj && dataObj.series && typeof dataObj.series === 'object') {
      displayObj = Object.fromEntries(Object.keys(dataObj.series).filter(k => k !== 'months').map(k => {
        const s = dataObj.series[k];
        const last = Array.isArray(s) ? s.at(-1) : s;
        return [k, last];
      }));
    } else if (dataObj && dataObj.components && dataObj.components.latest) {
      displayObj = dataObj.components.latest;
    } else {
      displayObj = dataObj || {};
    }

    Object.keys(displayObj).forEach(key => {
      const tr = document.createElement('tr');
      const raw = displayObj[key];
      const num = Number(raw);
      const safe = Number.isFinite(num) ? num : 0;
      tr.innerHTML = `<td>${key.replace(/_/g,' ')}</td><td class="number">${safe.toLocaleString()}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    panel.appendChild(table);

    if (!canvas) return;
    destroyChart(id);

    // choose only between 'line' and 'bar' (prefer line for time-series)
    let chartType = 'bar';

    if (dataObj && dataObj.series) {
      chartType = 'line';
      const months = dataObj.series.months || (window.financeData.incomeStatement || []).map(r => r.Month || '');
      const datasets = Object.keys(dataObj.series).filter(k => k !== 'months').map((k, i) => ({
        label: k.replace(/_/g, ' '),
        data: (dataObj.series[k] || []).map(v => { const n = Number(v); return Number.isFinite(n) ? n : 0; }),
        borderColor: `hsl(${(i * 60) % 360},70%,55%)`,
        backgroundColor: 'transparent',
        tension: 0.3,
        fill: false
      }));

      charts[id] = new Chart(canvas, { type: chartType, data: { labels: months, datasets }, options: baseOptions });
      return;
    }

    // if components object exists, render a bar chart of the latest components
    if (dataObj && dataObj.components && dataObj.components.latest) {
      const comp = dataObj.components.latest;
      const labels = Object.keys(comp).map(k => k.replace(/_/g, ' '));
      const values = Object.values(comp).map(v => { const n = Number(v); return Number.isFinite(n) ? n : 0; });
      charts[id] = new Chart(canvas, { type: 'bar', data: { labels, datasets: [{ label: title, data: values, backgroundColor: labels.map((_, i) => `hsl(${(i*60)%360},70%,55%)`), borderColor: '#fff' }] }, options: baseOptions });
      return;
    }

    // fallback: render bar chart for plain objects (latest numbers)
    const keys = Object.keys(dataObj || {});
    const vals = keys.map(k => { const n = Number(dataObj[k]); return Number.isFinite(n) ? n : 0; });
    charts[id] = new Chart(canvas, { type: 'bar', data: { labels: keys.map(k => k.replace(/_/g, ' ')), datasets: [{ label: title, data: vals, backgroundColor: '#00ffff99', borderColor: '#00ffff' }] }, options: baseOptions });
  }

  function runAnalysis() {
    try {
      const financeIntelligence = runFinanceEngine(window.financeData || { incomeStatement: [], balanceSheet: [], cashFlow: [] });
      renderAnalysisSection('working-capital', financeIntelligence.liquidity || {}, 'Working Capital');
      renderAnalysisSection('profitability', financeIntelligence.profitability || {}, 'Profitability & ROIC');
      renderAnalysisSection('operating-leverage', financeIntelligence.operatingLeverage || {}, 'Operating Leverage');
      renderAnalysisSection('capital-structure', financeIntelligence.capitalStructure || {}, 'Capital Structure');
      renderAnalysisSection('efficiency', financeIntelligence.efficiency || {}, 'Efficiency');
      renderAnalysisSection('valuation', financeIntelligence.valuation || {}, 'Valuation');
    } catch (err) {
      console.error('Analysis render error:', err);
    }
  }

  // -------------------------------
  // INITIAL RENDER
  // -------------------------------
  // ensure server-provided dataset gets enhanced before first render
  try { enhanceDatasets(window.financeData); } catch (err) { console.warn('enhanceDatasets error', err); }
  renderAll();
  runAnalysis();
  try { renderNarrative(window.financeData); } catch (err) { console.warn('renderNarrative error', err); }
});

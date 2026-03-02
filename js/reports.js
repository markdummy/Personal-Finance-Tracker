const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_NAMES_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// INITIALIZE PAGE
document.addEventListener("DOMContentLoaded", () => {
  console.log("📊 REPORTS PAGE LOADING...");

  populateYearSelect();
  setCurrentMonthYear();
  updateIncomeSummary();
  updateFinancialSummary();
  updateMonthlySpendingChart();
  setupFilters();
  setupExportButton();

  console.log("✅ REPORTS PAGE READY");
});

// RE-RENDER WHEN SERVER DATA ARRIVES (cross-device sync)
window.addEventListener("financedata:synced", () => {
  populateYearSelect();
  updateIncomeSummary();
  updateFinancialSummary();
  updateMonthlySpendingChart();
});

function populateYearSelect() {
  const yearSelect = document.getElementById("year-select");
  if (!yearSelect) return;

  const years = new Set();
  const currentYear = new Date().getFullYear();

  years.add(currentYear);
  years.add(currentYear + 1);

  let oldestYear = currentYear;
  let newestYear = currentYear;

  financeData.transactions.forEach((t) => {
    const year = new Date(t.date).getFullYear();
    years.add(year);
    if (year < oldestYear) oldestYear = year;
    if (year > newestYear) newestYear = year;
  });

  const rangeEnd = Math.max(currentYear + 1, newestYear);
  for (let year = oldestYear; year <= rangeEnd; year++) {
    years.add(year);
  }

  const sortedYears = Array.from(years).sort((a, b) => b - a);

  yearSelect.innerHTML = '<option value="">All Years</option>';

  sortedYears.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
}

function setCurrentMonthYear() {
  const now = new Date();
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");

  if (monthSelect) {
    monthSelect.value = now.getMonth() + 1; // Months are 0-indexed
  }

  if (yearSelect) {
    yearSelect.value = now.getFullYear();
  }
}

function updateIncomeSummary() {
  const thisMonthTransactions = Utils.getThisMonthTransactions(
    financeData.transactions
  );

  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  thisMonthTransactions.forEach((t) => {
    if (t.type === "income") monthlyIncome += t.amount;
    else if (t.type === "expense") monthlyExpenses += t.amount;
  });

  const netSavings = monthlyIncome - monthlyExpenses;
  const savingsRate =
    monthlyIncome > 0 ? ((netSavings / monthlyIncome) * 100).toFixed(1) : 0;

  const incomeBox = document.getElementById("filtered-income");
  const expenseBox = document.getElementById("filtered-expenses");
  const savingsBox = document.getElementById("filtered-savings");
  const savingsRateBox = document.getElementById("filtered-rate");

  if (incomeBox) incomeBox.textContent = Utils.formatCurrency(monthlyIncome);
  if (expenseBox)
    expenseBox.textContent = Utils.formatCurrency(monthlyExpenses);
  if (savingsBox) savingsBox.textContent = Utils.formatCurrency(netSavings);
  if (savingsRateBox) savingsRateBox.textContent = `${savingsRate}%`;
}

function updateFinancialSummary() {
  const thisMonthTransactions = Utils.getThisMonthTransactions(
    financeData.transactions
  );
  const expenses = thisMonthTransactions.filter((t) => t.type === "expense");

  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const avgDaily = daysInMonth > 0 ? totalExpenses / daysInMonth : 0;

  const categories = financeData.getCategorySummary();
  const highestCategory = categories.reduce(
    (max, cat) => (cat.spent > max.spent ? cat : max),
    { spent: 0, name: "None", icon: "📦" }
  );

  const totalTransactions = thisMonthTransactions.length;

  const budgetPercentage = financeData.budgetUsedPercentage;
  let performance = "✓ Good";
  if (budgetPercentage >= 100) performance = "⚠️ Over Budget";
  else if (budgetPercentage >= 90) performance = "⚠️ Warning";
  else if (budgetPercentage >= 75) performance = "→ Moderate";

  const avgDailyEl = document.getElementById("avg-daily");
  const avgDailyFooter = document.getElementById("days-based");

  const highestCatEl = document.getElementById("highest-cat");
  const highestCatFooter = document.getElementById("highest-cat-footer");

  const totalTransEl = document.getElementById("total-trans");

  const performanceEl = document.getElementById("budget-perf");
  const performanceFooter = document.getElementById("budget-perf-footer");

  if (avgDailyEl) avgDailyEl.textContent = Utils.formatCurrency(avgDaily);
  if (avgDailyFooter)
    avgDailyFooter.textContent = `Based on ${daysInMonth} days`;

  if (highestCatEl)
    highestCatEl.textContent = `${highestCategory.icon}${highestCategory.name}`;
  if (highestCatFooter && highestCategory.spent > 0) {
    const percentage = Utils.calculatePercentage(
      highestCategory.spent,
      totalExpenses
    );
    highestCatFooter.textContent = `${Utils.formatCurrency(
      highestCategory.spent
    )} (${percentage}% of Total)`;
  }

  if (totalTransEl) totalTransEl.textContent = totalTransactions;

  if (performanceEl) performanceEl.textContent = performance;
  if (performanceFooter)
    performanceFooter.textContent =
      budgetPercentage > 0
        ? `${budgetPercentage}% of budget used`
        : "Set budgets to track";
}

function updateMonthlySpendingChart() {
  const canvas = document.getElementById("monthlySpendingChart");
  if (!canvas) return;

  const monthlyExpenses = financeData.getMonthlyExpenses();
  const now = new Date();

  const labels = [];
  const data = [];

  for (let i = 9; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    const monthName = date.toLocaleDateString("en-US", { month: "short" });

    labels.push(monthName);
    data.push(monthlyExpenses[monthKey] || 0);
  }

  const backgroundColor = data.map((_, index) =>
    index === data.length - 1 ? "#ff8b8b" : "#8a9af2"
  );

  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.data.labels = labels;
    existingChart.data.datasets[0].data = data;
    existingChart.data.datasets[0].backgroundColor = backgroundColor;
    existingChart.update();
  } else {
    new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Expenses",
            data: data,
            backgroundColor: backgroundColor,
            borderRadius: 8,
            maxBarThickness: 50,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `₱${ctx.raw.toLocaleString()}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `₱${value / 1000}k`,
            },
            grid: { drawBorder: false },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }
}

function setupFilters() {
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  const categoryFilter = document.getElementById("category-select");
  const generateBtn = document.querySelector(".generate-btn");

  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      const month = monthSelect ? monthSelect.value : "";
      const year = yearSelect ? yearSelect.value : "";
      const category = categoryFilter ? categoryFilter.value : "Category: All";

      let periodText = "";
      if (month && year) {
        const monthName = monthSelect.options[monthSelect.selectedIndex].text;
        periodText = `${monthName} ${year}`;
      } else if (month) {
        const monthName = monthSelect.options[monthSelect.selectedIndex].text;
        periodText = monthName;
      } else if (year) {
        periodText = year;
      } else {
        periodText = "All Time";
      }

      Utils.showNotification(
        `Generating report for ${periodText} - ${category}...`,
        "info"
      );

      setTimeout(() => {
        applyFilters(month, year, category);
        Utils.showNotification("Report generated! 📊", "success");
      }, 500);
    });
  }
}

function applyFilters(month, year, category) {
  let filteredTransactions = [...financeData.transactions];

  if (month || year) {
    filteredTransactions = filteredTransactions.filter((t) => {
      const date = new Date(t.date);
      const matchMonth = month ? date.getMonth() + 1 === parseInt(month) : true;
      const matchYear = year ? date.getFullYear() === parseInt(year) : true;
      return matchMonth && matchYear;
    });
  }

  if (category && category !== "Category: All") {
    const cat = category.toLowerCase();
    filteredTransactions = filteredTransactions.filter(
      (t) => t.category === cat
    );
  }

  console.log(`Filtered ${filteredTransactions.length} transactions`);

  let income = 0;
  let expenses = 0;
  filteredTransactions.forEach((t) => {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expenses += t.amount;
  });

  const subtitle = document.getElementById("comparison-subtitle");
  if (subtitle) {
    let periodText = "";
    if (month && year) {
      periodText = `${MONTH_NAMES[parseInt(month)]} ${year}`;
    } else if (month) {
      periodText = MONTH_NAMES[parseInt(month)];
    } else if (year) {
      periodText = year;
    } else {
      periodText = "All Time";
    }
    subtitle.textContent = periodText;
  }

  const incomeBox = document.getElementById("filtered-income");
  const expenseBox = document.getElementById("filtered-expenses");
  const savingsBox = document.getElementById("filtered-savings");
  const savingsRateBox = document.getElementById("filtered-rate");

  if (incomeBox) incomeBox.textContent = Utils.formatCurrency(income);
  if (expenseBox) expenseBox.textContent = Utils.formatCurrency(expenses);
  if (savingsBox)
    savingsBox.textContent = Utils.formatCurrency(income - expenses);

  const savingsRate =
    income > 0 ? (((income - expenses) / income) * 100).toFixed(1) : 0;
  if (savingsRateBox) savingsRateBox.textContent = `${savingsRate}%`;

  updateFinancialSummaryWithFiltered(filteredTransactions, month, year);
}

function updateFinancialSummaryWithFiltered(transactions, month, year) {
  const expenses = transactions.filter((t) => t.type === "expense");

  let days = 30;
  if (month && year) {
    days = new Date(parseInt(year), parseInt(month), 0).getDate();
  } else if (month) {
    const currentYear = new Date().getFullYear();
    days = new Date(currentYear, parseInt(month), 0).getDate();
  } else if (year) {
    const selectedYear = parseInt(year);
    const currentYear = new Date().getFullYear();
    if (selectedYear === currentYear) {
      const startOfYear = new Date(selectedYear, 0, 1);
      const today = new Date();
      days = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      days = 365;
    }
  } else {
    if (transactions.length > 0) {
      const dates = transactions.map((t) => new Date(t.date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      days = Math.floor((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const avgDaily = days > 0 ? totalExpenses / days : 0;

  // Calculate category breakdown from filtered transactions
  const categoryTotals = {};
  expenses.forEach((exp) => {
    if (!categoryTotals[exp.category]) {
      categoryTotals[exp.category] = {
        name: Utils.getCategoryLabel(exp.category),
        icon: exp.icon || Utils.getCategoryIcon(exp.category),
        spent: 0,
      };
    }
    categoryTotals[exp.category].spent += exp.amount;
  });

  const highestCategory = Object.values(categoryTotals).reduce(
    (max, cat) => (cat.spent > max.spent ? cat : max),
    { spent: 0, name: "None", icon: "📦" }
  );

  const totalTransactions = transactions.length;

  // Calculate budget performance for the selected period
  const totalBudget = financeData.totalBudget;
  const budgetPercentage =
    totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

  let performance = "✓ Good";
  let performanceFooter = "";

  if (totalBudget === 0) {
    performance = "📊 No Budget";
    performanceFooter = "Set budgets to track";
  } else if (budgetPercentage >= 100) {
    performance = "⚠️ Over Budget";
    performanceFooter = `${budgetPercentage}% of budget used`;
  } else if (budgetPercentage >= 90) {
    performance = "⚠️ Warning";
    performanceFooter = `${budgetPercentage}% of budget used`;
  } else if (budgetPercentage >= 75) {
    performance = "→ Moderate";
    performanceFooter = `${budgetPercentage}% of budget used`;
  } else {
    performance = "✓ Good";
    performanceFooter = `${budgetPercentage}% of budget used`;
  }

  const avgDailyEl = document.getElementById("avg-daily");
  const avgDailyFooter = document.getElementById("days-based");
  const highestCatEl = document.getElementById("highest-cat");
  const highestCatFooter = document.getElementById("highest-cat-footer");
  const totalTransEl = document.getElementById("total-trans");
  const transFooter = document.getElementById("trans-footer");
  const performanceEl = document.getElementById("budget-perf");
  const performanceFooterEl = document.getElementById("budget-perf-footer");

  if (avgDailyEl) avgDailyEl.textContent = Utils.formatCurrency(avgDaily);
  if (avgDailyFooter) avgDailyFooter.textContent = `Based on ${days} days`;

  if (highestCatEl)
    highestCatEl.textContent = `${highestCategory.icon}${highestCategory.name}`;
  if (highestCatFooter && highestCategory.spent > 0) {
    const percentage = Utils.calculatePercentage(
      highestCategory.spent,
      totalExpenses
    );
    highestCatFooter.textContent = `${Utils.formatCurrency(
      highestCategory.spent
    )} (${percentage}% of Total)`;
  } else if (highestCatFooter) {
    highestCatFooter.textContent = "No expenses in period";
  }

  if (totalTransEl) totalTransEl.textContent = totalTransactions;
  if (transFooter) {
    if (month && year) {
      transFooter.textContent = `${MONTH_NAMES_SHORT[parseInt(month)]} ${year}`;
    } else if (month) {
      transFooter.textContent = MONTH_NAMES[parseInt(month)];
    } else if (year) {
      transFooter.textContent = year;
    } else {
      transFooter.textContent = "All time";
    }
  }

  // Update budget performance
  if (performanceEl) performanceEl.textContent = performance;
  if (performanceFooterEl) performanceFooterEl.textContent = performanceFooter;
}

function setupExportButton() {
  const exportBtn = document.querySelector(".export-btn");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportToCSV();
    });
  }
}

function exportToCSV() {
  const transactions = financeData.transactions;

  if (transactions.length === 0) {
    Utils.showNotification("No data to export", "warning");
    return;
  }

  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  const categoryFilter = document.getElementById("category-select");

  let filteredTransactions = [...transactions];
  let filename = "finance-report";

  // Filter by month
  if (monthSelect && monthSelect.value) {
    const month = parseInt(monthSelect.value);
    filename += `-${MONTH_NAMES_SHORT[month].toLowerCase()}`;
    filteredTransactions = filteredTransactions.filter((t) => {
      const date = new Date(t.date);
      return date.getMonth() + 1 === month;
    });
  }

  // Filter by year
  if (yearSelect && yearSelect.value) {
    const year = parseInt(yearSelect.value);
    filename += `-${year}`;
    filteredTransactions = filteredTransactions.filter((t) => {
      const date = new Date(t.date);
      return date.getFullYear() === year;
    });
  }

  // Filter by category
  if (categoryFilter && categoryFilter.value !== "Category: All") {
    const category = categoryFilter.value.toLowerCase();
    filename += `-${category}`;
    filteredTransactions = filteredTransactions.filter(
      (t) => t.category === category
    );
  }

  if (filteredTransactions.length === 0) {
    Utils.showNotification(
      "No transactions match the selected filters",
      "warning"
    );
    return;
  }

  filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  let csv = "Date,Type,Category,Description,Amount,Payment Method,Notes\n";

  filteredTransactions.forEach((t) => {
    csv += `${t.date},${t.type},${Utils.getCategoryLabel(t.category)},"${
      t.description
    }",${t.amount},${t.paymentMethod || "N/A"},"${t.notes || ""}"\n`;
  });

  csv += "\n";
  csv += "SUMMARY\n";

  let totalIncome = 0;
  let totalExpenses = 0;
  filteredTransactions.forEach((t) => {
    if (t.type === "income") totalIncome += t.amount;
    else if (t.type === "expense") totalExpenses += t.amount;
  });

  csv += `Total Income,,,₱${totalIncome.toLocaleString()}\n`;
  csv += `Total Expenses,,,₱${totalExpenses.toLocaleString()}\n`;
  csv += `Net Balance,,,₱${(totalIncome - totalExpenses).toLocaleString()}\n`;
  csv += `Total Transactions,,,${filteredTransactions.length}\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${Utils.getTodayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  Utils.showNotification(
    `CSV exported! ${filteredTransactions.length} transactions 📥`,
    "success"
  );
}

window.addEventListener("focus", () => {
  populateYearSelect();
  updateIncomeSummary();
  updateFinancialSummary();
  updateMonthlySpendingChart();
});

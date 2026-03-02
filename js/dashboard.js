// UPDATE ENTIRE DASHBOARD
function updateDashboard() {
  const hasData = financeData.hasData;

  Utils.toggleEmptyState("empty-state", "dashboard-content", hasData);

  const thisMonthTransactions = Utils.getThisMonthTransactions(
    financeData.transactions
  );

  const thisMonthIncome = thisMonthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonthExpenses = thisMonthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonthBalance = thisMonthIncome - thisMonthExpenses;

  const budgetUsedPercentage =
    financeData.totalBudget > 0
      ? Math.round((thisMonthExpenses / financeData.totalBudget) * 100)
      : 0;

  Utils.updateField("totalIncome", thisMonthIncome);
  Utils.updateField("totalExpenses", thisMonthExpenses);
  Utils.updateField("balance", thisMonthBalance);
  Utils.updateField("budgetUsedPercentage", budgetUsedPercentage);
  Utils.updateField("totalBudget", financeData.totalBudget);

  updateRecentTransactions();
  updateSpendingChart();
  updateCategoryChart(thisMonthTransactions);
}

function updateRecentTransactions() {
  const container = document.querySelector(".recent-transactions ul");
  if (!container) return;

  container.innerHTML = "";

  const recentTransactions = financeData.getRecentTransactions(3);

  if (recentTransactions.length === 0) {
    container.innerHTML =
      '<li style="text-align: center; padding: 20px; color: #9ca3af;">No transactions yet</li>';
    return;
  }

  recentTransactions.forEach((transaction) => {
    const li = document.createElement("li");
    li.className = "transaction-item";

    const isIncome = transaction.type === "income";
    const sign = isIncome ? "+" : "-";
    const amountClass = isIncome ? "positive" : "negative";

    li.innerHTML = `
      <span class="transaction-icon">${
        transaction.icon || Utils.getCategoryIcon(transaction.category)
      }</span>
      <div class="transaction-details">
        <strong>${transaction.description}</strong>
        <p>${Utils.getCategoryLabel(
          transaction.category
        )} - ${Utils.formatDateShort(transaction.date)}</p>
      </div>
      <span class="transaction-amount ${amountClass}">${sign}${Utils.formatCurrency(
      transaction.amount
    )}</span>
    `;

    container.appendChild(li);
  });
}

function updateSpendingChart() {
  const canvas = document.getElementById("spendingChart");
  if (!canvas) return;

  const monthlyExpenses = financeData.getMonthlyExpenses();

  // LAST 12 MONTHS
  const months = [];
  const data = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    months.push(Utils.getMonthName(date.getMonth()));
    data.push(monthlyExpenses[monthKey] || 0);
  }

  // CREATE OR UPDATE CHART
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.data.labels = months;
    existingChart.data.datasets[0].data = data;
    existingChart.update();
  } else {
    new Chart(canvas, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: "Spending",
            data: data,
            borderWidth: 3,
            borderColor: "#6C8CFF",
            backgroundColor: "rgba(108,140,255,0.3)",
            pointBackgroundColor: "#6C8CFF",
            pointRadius: 6,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            grid: { display: false },
            ticks: {
              callback: (value) => `₱${value.toLocaleString()}`,
            },
          },
          x: { grid: { display: false } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `₱${ctx.raw.toLocaleString()}`,
            },
          },
        },
      },
    });
  }
}

function updateCategoryChart(precomputedTransactions) {
  const canvas = document.getElementById("categoryChart");
  if (!canvas) return;

  const thisMonthTransactions = precomputedTransactions ||
    Utils.getThisMonthTransactions(financeData.transactions);
  const thisMonthExpenses = thisMonthTransactions.filter(
    (t) => t.type === "expense"
  );

  const categoryTotals = {};
  thisMonthExpenses.forEach((expense) => {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = {
        name: Utils.getCategoryLabel(expense.category),
        spent: 0,
        icon: expense.icon || Utils.getCategoryIcon(expense.category),
      };
    }
    categoryTotals[expense.category].spent += expense.amount;
  });

  const categories = Object.values(categoryTotals)
    .filter((cat) => cat.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  if (categories.length === 0) {
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "16px Roboto";
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "center";
    ctx.fillText("No expenses this month", canvas.width / 2, canvas.height / 2);
    return;
  }

  const labels = categories.map((cat) => cat.name);
  const data = categories.map((cat) => cat.spent);
  const colors = ["#4B6EF5", "#F25C54", "#F2C94C", "#9B59B6", "#E0E0E0"];

  const totalThisMonth = data.reduce((sum, val) => sum + val, 0);

  const legendContainer = document.querySelector(".donut-legend");
  if (legendContainer) {
    legendContainer.innerHTML = categories
      .map((cat, index) => {
        const percentage = Utils.calculatePercentage(cat.spent, totalThisMonth);
        return `
        <li>
          <span class="legend-box" style="background-color: ${
            colors[index]
          }"></span>
          ${cat.name} - ${Utils.formatCurrency(cat.spent)} (${percentage}%)
        </li>
      `;
      })
      .join("");
  }

  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.data.labels = labels;
    existingChart.data.datasets[0].data = data;
    existingChart.data.datasets[0].backgroundColor = colors.slice(
      0,
      categories.length
    );
    existingChart.update();
  } else {
    new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors.slice(0, categories.length),
            borderWidth: 0,
            cutout: "80%",
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
      },
      plugins: [
        {
          id: "center-text",
          beforeDraw(chart) {
            const {
              ctx,
              chartArea: { width, height },
            } = chart;
            ctx.save();
            ctx.font = "bold 24px Roboto";
            ctx.fillStyle = "#2C3E50";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const total = chart.data.datasets[0].data.reduce(
              (a, b) => a + b,
              0
            );
            ctx.fillText(`₱${total.toLocaleString()}`, width / 2, height / 2);
            ctx.font = "14px Roboto";
            ctx.fillStyle = "#6b7280";
            ctx.fillText("This Month", width / 2, height / 2 + 30);
          },
        },
      ],
    });
  }
}
// INITIALIZE DASHBOARD
document.addEventListener("DOMContentLoaded", () => {
  console.log("📊 DASHBOARD LOADING...");
  updateDashboard();
  console.log("✅ DASHBOARD READY");
});

// REFRESH DASHBOARD
window.addEventListener("focus", () => {
  updateDashboard();
});

// RE-RENDER WHEN SERVER DATA ARRIVES (cross-device sync)
window.addEventListener("financedata:synced", () => {
  updateDashboard();
});

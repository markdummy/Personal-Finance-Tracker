document.addEventListener("DOMContentLoaded", () => {
  console.log("💰 INCOME PAGE LOADING...");

  const title = document.getElementById("income-overview-title");
  if (title) {
    title.textContent = `${Utils.getCurrentMonthYear()} Income Overview`;
  }

  Utils.setDateToToday("income-date");
  setupIncomeForm();
  updateIncomePage();
  setupFilters();

  console.log("✅ INCOME PAGE READY");
});

// RE-RENDER WHEN SERVER DATA ARRIVES (cross-device sync)
window.addEventListener("financedata:synced", () => {
  updateIncomePage();
});

function setupIncomeForm() {
  const form = document.getElementById("income-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const amount = parseFloat(document.getElementById("income-amount").value);
    const source = document.getElementById("income-source").value;
    const description = document.getElementById("income-description").value;
    const date = document.getElementById("income-date").value;
    const payment = document.getElementById("income-payment").value;
    const notes = document.getElementById("income-notes").value;

    if (!amount || amount <= 0) {
      Utils.showNotification("Please enter a valid amount", "error");
      return;
    }

    if (!source) {
      Utils.showNotification("Please select income source", "error");
      return;
    }

    const transaction = {
      type: "income",
      amount: amount,
      category: source,
      description: description,
      date: date,
      paymentMethod: payment || "Bank",
      notes: notes,
      icon: Utils.getCategoryIcon(source),
    };

    const result = financeData.addTransaction(transaction);

    if (result) {
      Utils.showNotification("Income added successfully! 💰", "success");
      form.reset();
      Utils.setDateToToday("income-date");
      updateIncomePage();
    } else {
      Utils.showNotification("Failed to add income", "error");
    }
  });
}

function updateIncomePage() {
  updateSummaryCards();
  updateIncomeBreakdown();
  displayIncomeList();
}

function updateSummaryCards() {
  const thisMonthTransactions = Utils.getThisMonthTransactions(
    financeData.transactions
  );
  const thisMonthIncomes = thisMonthTransactions.filter(
    (t) => t.type === "income"
  );

  const thisMonthTotalIncome = thisMonthIncomes.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  Utils.updateField("totalIncome", thisMonthTotalIncome);

  const sources = new Set(thisMonthIncomes.map((t) => t.category));
  const sourcesEl = document.getElementById("income-sources-count");
  if (sourcesEl) sourcesEl.textContent = sources.size;

  const avgIncome =
    thisMonthIncomes.length > 0
      ? thisMonthTotalIncome / thisMonthIncomes.length
      : 0;
  const avgEl = document.getElementById("average-income");
  if (avgEl) avgEl.textContent = Utils.formatCurrency(avgIncome);

  if (thisMonthIncomes.length > 0) {
    const lastIncome = thisMonthIncomes[0];
    const amountEl = document.getElementById("last-income-amount");
    const dateEl = document.getElementById("last-income-date");
    if (amountEl)
      amountEl.textContent = Utils.formatCurrency(lastIncome.amount);
    if (dateEl) dateEl.textContent = Utils.formatDate(lastIncome.date);
  } else {
    const amountEl = document.getElementById("last-income-amount");
    const dateEl = document.getElementById("last-income-date");
    if (amountEl) amountEl.textContent = "₱0.00";
    if (dateEl) dateEl.textContent = "No income this month";
  }
}

function updateIncomeBreakdown() {
  const container = document.getElementById("income-breakdown");
  if (!container) return;

  const thisMonthTransactions = Utils.getThisMonthTransactions(
    financeData.transactions
  );
  const thisMonthIncomes = thisMonthTransactions.filter(
    (t) => t.type === "income"
  );

  if (thisMonthIncomes.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 50px; opacity: 0.3; margin-bottom: 10px;">📊</div>
        <p style="color: #9ca3af; margin: 0;">No income this month</p>
      </div>
    `;
    return;
  }

  const breakdown = {};
  thisMonthIncomes.forEach((income) => {
    if (!breakdown[income.category]) {
      breakdown[income.category] = { total: 0, count: 0, icon: income.icon };
    }
    breakdown[income.category].total += income.amount;
    breakdown[income.category].count++;
  });

  const sorted = Object.entries(breakdown).sort(
    (a, b) => b[1].total - a[1].total
  );

  const thisMonthTotal = thisMonthIncomes.reduce((sum, t) => sum + t.amount, 0);

  container.innerHTML = sorted
    .map(([source, data]) => {
      const percentage = Utils.calculatePercentage(data.total, thisMonthTotal);
      return `
      <div class="breakdown-item">
        <div class="breakdown-info">
          <div class="breakdown-icon">${data.icon}</div>
          <div class="breakdown-details">
            <h4>${Utils.getCategoryLabel(source)}</h4>
            <p>${data.count} ${
        data.count === 1 ? "entry" : "entries"
      } this month</p>
          </div>
        </div>
        <div class="breakdown-amount">
          <span class="amount">${Utils.formatCurrency(data.total)}</span>
          <span class="percentage">${percentage}%</span>
        </div>
      </div>
    `;
    })
    .join("");
}
function displayIncomeList() {
  applyFilters();
}

function setupFilters() {
  const sourceFilter = document.getElementById("filter-source");
  const periodFilter = document.getElementById("filter-period");

  if (sourceFilter) {
    sourceFilter.addEventListener("change", applyFilters);
  }

  if (periodFilter) {
    periodFilter.addEventListener("change", applyFilters);
  }
}

function applyFilters() {
  const container = document.getElementById("income-list");
  if (!container) return;

  let incomes = financeData.getTransactionsByType("income");

  const sourceFilter = document.getElementById("filter-source");
  if (sourceFilter && sourceFilter.value) {
    incomes = incomes.filter((t) => t.category === sourceFilter.value);
  }

  const periodFilter = document.getElementById("filter-period");
  const period = periodFilter ? periodFilter.value : "this-month"; // DEFAULT TO THIS MONTH

  if (period !== "all") {
    const now = new Date();
    incomes = incomes.filter((t) => {
      const transactionDate = new Date(t.date);
      switch (period) {
        case "this-month":
          return (
            transactionDate.getMonth() === now.getMonth() &&
            transactionDate.getFullYear() === now.getFullYear()
          );
        case "last-month":
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
          return (
            transactionDate.getMonth() === lastMonth.getMonth() &&
            transactionDate.getFullYear() === lastMonth.getFullYear()
          );
        case "this-year":
          return transactionDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }

  if (incomes.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 50px; opacity: 0.3; margin-bottom: 10px;">💵</div>
        <p style="color: #9ca3af; margin: 0;">No income entries found</p>
      </div>
    `;
    return;
  }

  container.innerHTML = incomes
    .map(
      (income) => `
    <div class="income-item">
      <div class="income-item-info">
        <div class="income-icon">${income.icon}</div>
        <div class="income-details">
          <h4>${income.description}</h4>
          <p>${Utils.getCategoryLabel(income.category)} • ${Utils.formatDate(
        income.date
      )}</p>
        </div>
      </div>
      <span class="income-amount">+${Utils.formatCurrency(income.amount)}</span>
      <div class="income-actions">
        <button class="btn-icon edit" onclick="editIncome(${
          income.id
        })" title="Edit">✏️</button>
        <button class="btn-icon delete" onclick="deleteIncome(${
          income.id
        })" title="Delete">🗑️</button>
      </div>
    </div>
  `
    )
    .join("");
}

function deleteIncome(id) {
  if (!confirm("Delete this income entry?")) return;

  const success = financeData.deleteTransaction(id);

  if (success) {
    Utils.showNotification("Income deleted! 🗑️", "success");
    updateIncomePage();
  } else {
    Utils.showNotification("Failed to delete income", "error");
  }
}

function editIncome(id) {
  const transaction = financeData.transactions.find((t) => t.id === id);
  if (!transaction) return;

  document.getElementById("income-amount").value = transaction.amount;
  document.getElementById("income-source").value = transaction.category;
  document.getElementById("income-description").value = transaction.description;
  document.getElementById("income-date").value = transaction.date;
  document.getElementById("income-payment").value =
    transaction.paymentMethod || "";
  document.getElementById("income-notes").value = transaction.notes || "";

  const form = document.getElementById("income-form");
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = "✓ Update Income";
  submitBtn.style.background = "#f59e0b";

  Utils.scrollToElement("income-form");

  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  newForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const amount = parseFloat(newForm.querySelector("#income-amount").value);
    const source = newForm.querySelector("#income-source").value;
    const description = newForm.querySelector("#income-description").value;
    const date = newForm.querySelector("#income-date").value;
    const payment = newForm.querySelector("#income-payment").value;
    const notes = newForm.querySelector("#income-notes").value;

    const success = financeData.updateTransaction(id, {
      amount: amount,
      category: source,
      description: description,
      date: date,
      paymentMethod: payment,
      notes: notes,
      icon: Utils.getCategoryIcon(source),
    });

    if (success) {
      Utils.showNotification("Income updated! ✅", "success");
      newForm.reset();
      Utils.setDateToToday("income-date");

      const btn = newForm.querySelector('button[type="submit"]');
      btn.textContent = "✓ Add Income";
      btn.style.background = "#10b981";

      updateIncomePage();
      setupIncomeForm();
    } else {
      Utils.showNotification("Failed to update income", "error");
    }
  });
}

window.deleteIncome = deleteIncome;
window.editIncome = editIncome;

window.addEventListener("focus", updateIncomePage);

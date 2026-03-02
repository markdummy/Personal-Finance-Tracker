document.addEventListener("DOMContentLoaded", () => {
  console.log("🎯 BUDGET PAGE LOADING...");

  const title = document.getElementById("budget-title");
  if (title) {
    title.textContent = `${Utils.getCurrentMonthYear()} Budget Overview`;
  }

  updateBudgetSummary();
  displayCategoryBudgets();
  setupSetBudgetButton();

  console.log("✅ BUDGET PAGE READY");
});

// RE-RENDER WHEN SERVER DATA ARRIVES (cross-device sync)
window.addEventListener("financedata:synced", () => {
  updateBudgetSummary();
  displayCategoryBudgets();
});

function updateBudgetSummary() {
  const thisMonthTransactions = Utils.getThisMonthTransactions(
    financeData.transactions
  );
  const thisMonthExpenses = thisMonthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const budgetRemaining = financeData.totalBudget - thisMonthExpenses;
  const budgetUsedPercentage =
    financeData.totalBudget > 0
      ? Math.round((thisMonthExpenses / financeData.totalBudget) * 100)
      : 0;

  Utils.updateField("totalBudget", financeData.totalBudget);
  Utils.updateField("totalExpenses", thisMonthExpenses);
  Utils.updateField("budgetRemaining", budgetRemaining);
  Utils.updateField("budgetUsedPercentage", budgetUsedPercentage);
}

function displayCategoryBudgets() {
  const container = document.querySelector(".budg-percentage");
  if (!container) return;

  container.innerHTML = "";

  const categories = financeData.getCategorySummary();

  const hasBudgets = categories.some((cat) => cat.budget > 0);

  if (!hasBudgets) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 60px; margin-bottom: 20px;">🎯</div>
        <h3 style="color: #2c3e50; margin-bottom: 10px;">No Budgets Set</h3>
        <p style="color: #6b7280; margin-bottom: 20px;">
          Set budgets for different categories to track your spending
        </p>
        <button onclick="openBudgetModal()" class="btn" style="background: #4a6cf7; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
          Set Your First Budget
        </button>
      </div>
    `;
    return;
  }

  const thisMonthTransactions = Utils.getThisMonthTransactions(
    financeData.transactions
  );
  const thisMonthExpenses = thisMonthTransactions.filter(
    (t) => t.type === "expense"
  );

  const categorySpending = {};
  thisMonthExpenses.forEach((expense) => {
    if (!categorySpending[expense.category]) {
      categorySpending[expense.category] = 0;
    }
    categorySpending[expense.category] += expense.amount;
  });

  categories.forEach((category) => {
    const thisMonthSpent = categorySpending[category.id] || 0;
    const percentage =
      category.budget > 0
        ? Math.round((thisMonthSpent / category.budget) * 100)
        : 0;
    const remaining = category.budget - thisMonthSpent;
    const isOverBudget = remaining < 0;

    let barColor = "#10b981";
    if (percentage >= 90) barColor = "#ef4444";
    else if (percentage >= 75) barColor = "#f59e0b";
    else if (percentage >= 50) barColor = "#3b82f6";

    const item = document.createElement("div");
    item.className = "budg-percentage-item";

    item.innerHTML = `
      <span class="budgcat-icon-cards">${category.icon}</span>
      <div class="budg-text-content">
        <h4>${category.name}</h4>
        <p>₱${thisMonthSpent.toLocaleString()} of ₱${category.budget.toLocaleString()}</p>
        ${
          isOverBudget
            ? `<p style="color: #ef4444; font-size: 12px; margin-top: 4px;">Over by ₱${Math.abs(
                remaining
              ).toLocaleString()}</p>`
            : ""
        }
      </div>
      <div class="budg-progress-wrapper">
        <div class="budg-progress-bar">
          <div class="budg-progress-fill" style="width: ${Math.min(
            percentage,
            100
          )}%; background-color: ${barColor};"></div>
        </div>
      </div>
      <span class="budg-percentage" style="color: ${barColor};">${percentage}%</span>
      <button class="btn-icon edit" onclick="editCategoryBudget('${
        category.id
      }')" title="Edit Budget" style="margin-left: 12px;">✏️</button>
    `;

    container.appendChild(item);
  });
}

function setupSetBudgetButton() {
  const btn = document.querySelector(".set-budget-btn");

  if (!btn) {
    console.error("❌ SET BUDGET BUTTON NOT FOUND");
    return;
  }

  console.log("✅ SET BUDGET BUTTON FOUND");

  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener("click", () => {
    console.log("🎯 OPENING BUDGET MODAL");
    openBudgetModal();
  });
}

function openBudgetModal(categoryId = null) {
  const modal = document.createElement("div");
  modal.id = "budget-modal";
  modal.className = "modal";
  modal.style.display = "flex";

  const categories = financeData.getCategorySummary();
  const editMode = categoryId !== null;
  const editCategory = editMode
    ? categories.find((c) => c.id === categoryId)
    : null;

  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeBudgetModal()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>💰 ${editMode ? "Edit Budget" : "Set Budget"}</h2>
        <button class="modal-close" onclick="closeBudgetModal()">✕</button>
      </div>
      
      <form id="budget-form" style="padding: 28px;">
        ${
          !editMode
            ? `
          <div class="form-group">
            <label>Category</label>
            <select id="budget-category" required>
              <option value="">Select category</option>
              ${categories
                .map(
                  (cat) =>
                    `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
                )
                .join("")}
            </select>
          </div>
        `
            : `
          <input type="hidden" id="budget-category" value="${categoryId}" />
          <div class="form-group">
            <label>Category</label>
            <div style="padding: 12px; background: #f3f4f6; border-radius: 8px; font-weight: 600;">
              ${editCategory.icon} ${editCategory.name}
            </div>
          </div>
        `
        }
        
        <div class="form-group">
          <label>Budget Amount</label>
          <input 
            type="number" 
            id="budget-amount" 
            placeholder="₱0.00" 
            step="0.01" 
            min="0.01"
            value="${editMode ? editCategory.budget : ""}"
            required 
          />
        </div>
        
        ${
          editMode
            ? `
          <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #0369a1;">
              <strong>Current Spending:</strong> ₱${editCategory.spent.toLocaleString()}<br>
              <strong>Previous Budget:</strong> ₱${editCategory.budget.toLocaleString()}
            </p>
          </div>
        `
            : ""
        }
        
        <div class="modal-actions" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <button type="button" class="btn btn--secondary" onclick="closeBudgetModal()">
            Cancel
          </button>
          <button type="submit" class="btn btn--success">
            ${editMode ? "✓ Update Budget" : "✓ Set Budget"}
          </button>
        </div>
      </form>
    </div>
  `;
        
  document.body.appendChild(modal);

  const form = document.getElementById("budget-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const category = document.getElementById("budget-category").value;
    const amount = parseFloat(document.getElementById("budget-amount").value);

    if (!category) {
      Utils.showNotification("Please select a category", "error");
      return;
    }

    if (!amount || amount <= 0) {
      Utils.showNotification("Please enter a valid amount", "error");
      return;
    }

    const success = financeData.setBudget(category, amount);

    if (success) {
      Utils.showNotification(
        `Budget ${editMode ? "updated" : "set"} successfully! 🎯`,
        "success"
      );
      closeBudgetModal();
      updateBudgetSummary();
      displayCategoryBudgets();
    } else {
      Utils.showNotification("Failed to set budget", "error");
    }
  });

  setTimeout(() => {
    document.getElementById("budget-amount").focus();
  }, 100);
}

function closeBudgetModal() {
  const modal = document.getElementById("budget-modal");
  if (modal) {
    modal.remove();
  }
}

function editCategoryBudget(categoryId) {
  openBudgetModal(categoryId);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeBudgetModal();
  }
});

window.openBudgetModal = openBudgetModal;
window.closeBudgetModal = closeBudgetModal;
window.editCategoryBudget = editCategoryBudget;

window.addEventListener("focus", () => {
  updateBudgetSummary();
  displayCategoryBudgets();
});

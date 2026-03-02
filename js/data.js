const FinanceDataStore = {
  // CORE TOTALSS
  totalIncome: 0,
  totalExpenses: 0,
  totalBudget: 0,

  // CATEGORIES DATA
  categories: {
    food: { name: "Food & Dining", spent: 0, budget: 0, icon: "🍔" },
    transport: { name: "Transport", spent: 0, budget: 0, icon: "🚗" },
    shopping: { name: "Shopping", spent: 0, budget: 0, icon: "🛍️" },
    utilities: { name: "Utilities", spent: 0, budget: 0, icon: "💡" },
    others: { name: "Others", spent: 0, budget: 0, icon: "📦" },
  },

  // ALL TRANSACTIONS
  transactions: [],

  // CALCULATED DATAA
  get balance() {
    return this.totalIncome - this.totalExpenses;
  },

  get budgetRemaining() {
    return this.totalBudget - this.totalExpenses;
  },

  get budgetUsedPercentage() {
    if (this.totalBudget === 0) return 0;
    return Math.round((this.totalExpenses / this.totalBudget) * 100);
  },

  get hasData() {
    return (
      this.totalIncome > 0 ||
      this.totalExpenses > 0 ||
      this.transactions.length > 0
    );
  },

  addTransaction(transaction) {
    if (!transaction.type || !transaction.amount || !transaction.description) {
      console.error("❌ MISSING REQUIRED FIELDS", transaction);
      return null;
    }

    transaction.id ||= Date.now() + Math.random();
    transaction.createdAt = new Date().toISOString();

    this.transactions.unshift(transaction);

    if (transaction.type === "expense") {
      this.totalExpenses += transaction.amount;
      if (this.categories[transaction.category]) {
        this.categories[transaction.category].spent += transaction.amount;
      }
    } else {
      this.totalIncome += transaction.amount;
    }

    this.save();
    console.log("✅ Transaction added");
    return transaction;
  },

  setBudget(category, amount) {
    if (!this.categories[category] || amount < 0) return false;

    this.categories[category].budget = amount;
    this.totalBudget = Object.values(this.categories).reduce(
      (sum, cat) => sum + cat.budget,
      0
    );

    this.save();
    console.log(`✅ Budget set: ${category} = ₱${amount}`);
    return true;
  },

  deleteTransaction(transactionId) {
    const index = this.transactions.findIndex((t) => t.id === transactionId);
    if (index === -1) return false;

    const t = this.transactions[index];

    if (t.type === "expense") {
      this.totalExpenses -= t.amount;
      if (this.categories[t.category]) {
        this.categories[t.category].spent -= t.amount;
      }
    } else {
      this.totalIncome -= t.amount;
    }

    this.transactions.splice(index, 1);
    this.save();
    console.log("✅ Transaction deleted");
    return true;
  },

  updateTransaction(transactionId, updates) {
    const t = this.transactions.find((tx) => tx.id === transactionId);
    if (!t) return false;

    // REMOVE OLD AMOUNTS
    if (t.type === "expense") {
      this.totalExpenses -= t.amount;
      if (this.categories[t.category]) {
        this.categories[t.category].spent -= t.amount;
      }
    } else {
      this.totalIncome -= t.amount;
    }

    // UPDATE TRANSACTION

    Object.assign(t, updates);
    t.updatedAt = new Date().toISOString();

    // ADD NEW AMOUNTS
    if (t.type === "expense") {
      this.totalExpenses += t.amount;
      if (this.categories[t.category]) {
        this.categories[t.category].spent += t.amount;
      }
    } else {
      this.totalIncome += t.amount;
    }

    this.save();
    console.log("✅ Transaction updated");
    return true;
  },

  getTransactionsByType(type) {
    return this.transactions.filter((t) => t.type === type);
  },

  getTransactionsByCategory(category) {
    return this.transactions.filter((t) => t.category === category);
  },

  getRecentTransactions(limit = 10) {
    return this.transactions.slice(0, limit);
  },

  getCategorySummary() {
    return Object.entries(this.categories).map(([id, c]) => ({
      id,
      name: c.name,
      icon: c.icon,
      spent: c.spent,
      budget: c.budget,
      percentage: c.budget ? Math.round((c.spent / c.budget) * 100) : 0,
      remaining: c.budget - c.spent,
    }));
  },

  getMonthlyExpenses() {
    const monthlyData = {};

    this.transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + t.amount;
      });

    return monthlyData;
  },

  save() {
    try {
      const data = {
        totalIncome: this.totalIncome,
        totalExpenses: this.totalExpenses,
        totalBudget: this.totalBudget,
        categories: this.categories,
        transactions: this.transactions,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem("financeTrackerData", JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("❌ SAVE FAILED", error);
      return false;
    }
  },

  // LOAD FROM LOCALSTORAGE
  load() {
    try {
      const saved = localStorage.getItem("financeTrackerData");
      if (!saved) {
        console.log("ℹ️ NO SAVED DATA - STARTING FRESH");
        return false;
      }

      const data = JSON.parse(saved);
      this.totalIncome = data.totalIncome || 0;
      this.totalExpenses = data.totalExpenses || 0;
      this.totalBudget = data.totalBudget || 0;
      this.categories = data.categories || this.categories;
      this.transactions = data.transactions || [];

      console.log("✅ DATA LOADED", {
        income: this.totalIncome,
        expenses: this.totalExpenses,
        transactions: this.transactions.length,
      });
      return true;
    } catch (error) {
      console.error("❌ LOAD FAILED", error);
      return false;
    }
  },

  // RESET ALL DATA
  reset() {
    if (!confirm("⚠️ DELETE ALL DATA? CANNOT BE UNDONE!")) return false;

    this.totalIncome = 0;
    this.totalExpenses = 0;
    this.totalBudget = 0;

    Object.keys(this.categories).forEach((key) => {
      this.categories[key].spent = 0;
      this.categories[key].budget = 0;
    });

    this.transactions = [];
    localStorage.removeItem("financeTrackerData");

    console.log("🗑️ ALL DATA CLEARED");
    return true;
  },

  // EXPORT DATA AS JSON
  exportData() {
    const dataStr = JSON.stringify(
      {
        totalIncome: this.totalIncome,
        totalExpenses: this.totalExpenses,
        totalBudget: this.totalBudget,
        categories: this.categories,
        transactions: this.transactions,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );

    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);

    console.log("📥 DATA EXPORTED");
  },

  // IMPORT DATA FROM JSON
  importData(importedData) {
    try {
      this.totalIncome = importedData.totalIncome || 0;
      this.totalExpenses = importedData.totalExpenses || 0;
      this.totalBudget = importedData.totalBudget || 0;
      this.categories = importedData.categories || this.categories;
      this.transactions = importedData.transactions || [];

      this.save();
      console.log("✅ DATA IMPORTED");
      return true;
    } catch (error) {
      console.error("❌ IMPORT FAILED", error);
      return false;
    }
  },

  // INITIALIZE
  init() {
    console.log("🚀 INITIALIZING FINANCE DATA STORE...");
    this.load();
    console.log("✅ READY!");
    return this;
  },

  
  getThisMonthCategorySpending() {
    const now = new Date();
    const thisMonthTransactions = this.transactions.filter((t) => {
      const date = new Date(t.date);
      return (
        t.type === "expense" &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    });

    const spending = {};
    thisMonthTransactions.forEach((t) => {
      if (!spending[t.category]) {
        spending[t.category] = 0;
      }
      spending[t.category] += t.amount;
    });

    return spending;
  },
};

// AUTO-INITIALIZE
FinanceDataStore.init();
window.financeData = FinanceDataStore;

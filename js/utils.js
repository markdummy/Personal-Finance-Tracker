// UTILITY FUNCTIONS REUSABLE HELPERSS

const Utils = {
  formatCurrency(amount) {
    return `₱${Math.abs(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  },

  formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  },

  getMonthName(monthIndex) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[monthIndex];
  },

  getCurrentMonthYear() {
    const now = new Date();
    return `${this.getMonthName(now.getMonth())} ${now.getFullYear()}`;
  },

  // UPDATE FIELD VALUEe (USING DATA-FIELD ATTRIBUTE)
  updateField(fieldName, value) {
    const elements = document.querySelectorAll(`[data-field="${fieldName}"]`);

    elements.forEach((element) => {
      if (fieldName.includes("Percentage")) {
        element.textContent = `${value}%`;
      } else if (fieldName.includes("count") || fieldName.includes("Count")) {
        element.textContent = value;
      } else {
        element.textContent = this.formatCurrency(value);
      }
    });
  },

  toggleEmptyState(emptyStateId, contentId, hasData) {
    const emptyState = document.getElementById(emptyStateId);
    const content = document.getElementById(contentId);

    if (!emptyState || !content) return;

    if (hasData) {
      emptyState.style.display = "none";
      content.style.display = "block";
    } else {
      emptyState.style.display = "flex";
      content.style.display = "none";
    }
  },

  showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification notification--${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add("show"), 10);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },

  getCategoryIcon(category) {
    const icons = {
      food: "🍔",
      transport: "🚗",
      shopping: "🛍️",
      utilities: "💡",
      others: "📦",
      salary: "💼",
      freelance: "💻",
      business: "🏢",
      investment: "📈",
      rental: "🏠",
      bonus: "🎁",
      refund: "↩️",
      gift: "🎉",
    };
    return icons[category] || "💰";
  },

  getCategoryLabel(category) {
    const labels = {
      food: "Food & Dining",
      transport: "Transport",
      shopping: "Shopping",
      utilities: "Utilities",
      others: "Others",
      salary: "Salary/Wages",
      freelance: "Freelance Work",
      business: "Business Income",
      investment: "Investment Returns",
      rental: "Rental Income",
      bonus: "Bonus/Commission",
      refund: "Refund",
      gift: "Gift/Prize",
    };
    return labels[category] || category;
  },

  validateAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  },
  //(YYYY-MM-DD FORMAT)
  getTodayDate() {
    return new Date().toISOString().split("T")[0];
  },

  calculatePercentage(part, total) {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  },

  truncateText(text, maxLength = 30) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  },
  //(FOR SEARCH)
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  sortBy(array, property, order = "asc") {
    return [...array].sort((a, b) => {
      if (order === "asc") {
        return a[property] > b[property] ? 1 : -1;
      } else {
        return a[property] < b[property] ? 1 : -1;
      }
    });
  },

  groupByDate(transactions) {
    const grouped = {};

    transactions.forEach((t) => {
      const date = t.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(t);
    });

    return grouped;
  },

  filterByDateRange(transactions, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return transactions.filter((t) => {
      const date = new Date(t.date);
      return date >= start && date <= end;
    });
  },

  getThisMonthTransactions(transactions) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.filterByDateRange(transactions, startOfMonth, endOfMonth);
  },

  // GET LAST MONTH'S TRANSACTIONS
  getLastMonthTransactions(transactions) {
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    return this.filterByDateRange(
      transactions,
      startOfLastMonth,
      endOfLastMonth
    );
  },

  exportToCSV(data, filename = "export") {
    // CREATE CSV HEADER
    let csv = "Date,Type,Category,Description,Amount,Payment Method\n";

    // ADD ROWS
    data.forEach((item) => {
      csv += `${item.date},${item.type},${item.category},"${
        item.description
      }",${item.amount},${item.paymentMethod || "N/A"}\n`;
    });

    // CREATE DOWNLOAD
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${this.getTodayDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    console.log("📥 CSV EXPORTED");
  },

  //ALL FORM INPUTS
  clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
    }
  },

  setDateToToday(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.valueAsDate = new Date();
    }
  },

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  },

  isMobile() {
    return window.innerWidth <= 768;
  },

  copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.showNotification("Copied to clipboard! 📋", "success");
      })
      .catch(() => {
        this.showNotification("Failed to copy", "error");
      });
  },

  // CONFIRM ACTION
  confirm(message) {
    return window.confirm(message);
  },

  // GENERATE RANDOM ID
  generateId() {
    return Date.now() + Math.random().toString(36).substring(2, 11);
  },
};
// MAKE GLOBALLY AVAILABLE
window.Utils = Utils;

console.log("🛠️ UTILS LOADED");

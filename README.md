# 💰 Personal Finance Tracker

A modern, intuitive web application for managing personal finances with real-time tracking, budget management, and comprehensive reporting features.

![Finance Tracker](https://img.shields.io/badge/version-1.0.0-blue)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## 🌟 Features

### 📊 **Dashboard**
- Real-time overview of monthly income, expenses, and balance
- Interactive spending trends chart (12-month view)
- Category breakdown with donut chart visualization
- Recent transactions list
- Monthly budget utilization tracking

### 💵 **Income Management**
- Add, edit, and delete income entries
- Multiple income source categories (Salary, Freelance, Business, Investment, etc.)
- Income source breakdown and analytics
- Filter by source type and time period
- Track average income and last received amount

### 🎯 **Budget Tracking**
- Set monthly budgets per category
- Real-time progress bars with color-coded alerts (Green → Blue → Orange → Red)
- Visual spending indicators
- Over-budget warnings
- Edit budgets anytime

### 💸 **Expense Tracking**
- Quick expense entry with detailed categorization
- Search and filter capabilities
- Edit and delete existing expenses
- Payment method tracking
- Optional notes for each transaction

### 📈 **Reports & Analytics**
- Monthly spending comparison charts
- Income vs Expenses analysis
- Financial summary cards (Average daily spending, highest category, etc.)
- Savings rate calculation
- **CSV Export** - Download filtered transaction data
- Custom date range and category filtering

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Vercel Deployment (recommended — cross-device login)

The live site at https://personal-finance-tracker-one-lyart.vercel.app/ uses
**Vercel Postgres** to store accounts in the cloud so you can log in from any
device (PC, iPhone, Android, etc.).

To enable this for your own Vercel fork:

1. Open your project in the [Vercel dashboard](https://vercel.com/dashboard).
2. Go to **Storage → Create Database → Postgres** and follow the wizard.
3. Click **Connect Project** — Vercel automatically adds the `POSTGRES_URL`
   environment variable to your deployment.
4. Redeploy the project.  The serverless API functions in `api/` will now
   create the required tables on first use.

> **Note:** Without a Vercel Postgres database the app falls back to storing
> accounts in your browser's `localStorage`, which is device-specific and
> cannot be shared across devices.

### Local Development (with shared backend)

To test cross-device login on your local network, run the included Express
backend — it serves both the frontend and the REST API:

```bash
cd backend
npm install
node server.js          # starts on http://localhost:3000
```

Other devices on the same Wi-Fi network can reach it at
`http://<your-pc-ip>:3000` (find your IP with `ipconfig` / `ip addr`).

### Static-only (no backend)

```bash
   # Simply open index.html in your browser
   # Or use a local server:
   
   # Python 3
   python -m http.server 8000
   
   # Node.js (with npx)
   npx http-server
```

> **Note:** In static-only mode accounts are stored in `localStorage` and are
> not shared across devices.

3. **Access the app**
   - Open `http://localhost:8000` in your browser
   - Or directly open `index.html` file
   - Or open in this link https://personal-finance-tracker-one-lyart.vercel.app/

### Quick Start Guide

1. **Set Your Budget**
   - Navigate to the Budget page
   - Click "+ Set Budget"
   - Choose a category and enter your monthly budget limit
   - Click "Set Budget"

2. **Add Income**
   - Go to the Income page
   - Fill in the amount, source, and description
   - Click "Add Income"

3. **Track Expenses**
   - Navigate to the Expenses page
   - Enter expense details
   - Click "Add Expense"

4. **View Reports**
   - Check the Dashboard for overview
   - Visit Reports page for detailed analytics
   - Export data to CSV for external analysis


## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charts**: Chart.js v4.4.0
- **Data Storage**: Vercel Postgres (cloud) with localStorage cache/fallback
- **Backend API**: Vercel Serverless Functions (Node.js)
- **Design**: Custom CSS with modern UI/UX principles

## 💾 Data Storage

When deployed on Vercel with a Postgres database:
- ✅ Accounts and finance data stored in the cloud
- ✅ Log in from any device (PC, iPhone, Android, …)
- ✅ Data persists between sessions and across browsers
- ✅ Export functionality for backup

Without a Vercel Postgres database (static / offline mode):
- ⚠️ Data stored only in the current browser's `localStorage`
- ⚠️ Accounts are **not** shared across devices

### Backup Your Data

1. Go to Reports page
2. Click "Export CSV" to download transaction history
3. Alternatively, open browser console and run:
```javascript
   financeData.exportData(); // Downloads JSON backup
```

### Clear All Data

Open browser console and run:
```javascript
financeData.reset(); // Clears all data (cannot be undone)
```

## 📱 Browser Compatibility

| Browser | Supported Version |
|---------|------------------|
| Chrome  | ✅ 90+           |
| Firefox | ✅ 88+           |
| Safari  | ✅ 14+           |
| Edge    | ✅ 90+           |
| Opera   | ✅ 76+           |

## 🎨 Features Breakdown

### Dashboard
- Monthly income/expense overview
- Balance calculation
- Budget utilization percentage
- 12-month spending trend chart
- Category breakdown donut chart
- Recent transactions (last 3)

### Income Page
- Quick add income form
- Income sources: Salary, Freelance, Business, Investment, Bonus, Gift
- Income breakdown by source
- Filter by source and time period
- Edit/delete existing entries
- Average income calculation

### Budget Page
- Set monthly budgets per category
- Real-time spending vs budget tracking
- Color-coded progress bars:
  - 🟢 Green (0-49%): On track
  - 🔵 Blue (50-74%): Moderate
  - 🟠 Orange (75-89%): Warning
  - 🔴 Red (90%+): Over budget
- Edit budgets anytime
- Over-budget alerts

### Expenses Page
- Quick expense entry
- Categories: Food, Transport, Shopping, Utilities, Others
- Search expenses by description/category
- Filter by category
- Edit/delete expenses
- Payment method tracking

### Reports Page
- Monthly spending bar chart (10 months)
- Income vs Expenses comparison
- Net savings calculation
- Savings rate percentage
- Financial summary cards:
  - Average daily spending
  - Highest spending category
  - Total transactions count
  - Budget performance
- CSV export with filters
- Generate custom reports

## 🔒 Privacy & Security

- **Server-backed**: Account credentials and finance data stored in Vercel Postgres when configured
- **No Tracking**: No analytics or tracking scripts
- **Offline Capable**: Falls back to localStorage when the server is unavailable

## 🐛 Known Issues & Limitations

- Cross-device login requires a Vercel Postgres database (see Getting Started)
- Maximum localStorage limit (~5-10MB depending on browser) applies in offline mode
- No multi-currency support (PHP only)



## 📝 Future Enhancements

- [ ] Multi-currency support
- [ ] Dark mode toggle
- [ ] Recurring transactions automation
- [x] Cloud sync / cross-device login (Vercel Postgres)
- [ ] Mobile app version
- [x] Password protection
- [ ] Bill reminders
- [ ] Financial goals tracking
- [ ] Investment portfolio tracking
- [x] Multi-user accounts


## 👨‍💻 Author

- GitHub: [@dobladamark](https://github.com/dobladamark)
- Email: dobladamark1@gmail.com
- Portfolio: [dobladamark.com](https://dobladamark.com)

## 🙏 Acknowledgments

- Chart.js for beautiful chart visualizations
- Font Awesome for icons (if used)
- Inspiration from popular finance apps like Mint, YNAB, and Wallet



**Made with ❤️ for better financial management**

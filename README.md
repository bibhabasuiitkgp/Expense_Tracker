# ExpenseFlow — Personal Finance Dashboard

A full-stack personal finance web application built for fast, one-handed daily expense logging with powerful insights, anomaly detection, and investment tracking. 

Built with **Node.js, Express, MongoDB Atlas, and Vanilla HTML/CSS/JS**.

## Features

- **Mobile-first Design:** Smooth, app-like interface with glassmorphism, dark/light mode, and bottom navigation.
- **Fast Entry & NLP:** Log expenses manually or use the Quick Entry feature (e.g. type `"paid 450 for lunch on card"` to auto-fill).
- **Dashboard & Insights:** 
  - Monthly spending vs previous month.
  - Category breakdown donut chart.
  - GitHub-style daily spend heatmap.
  - 12-month trend line.
- **Anomaly Detection:** Automatically flags expenses that are 2 standard deviations above your historical average for that category.
- **Spend Forecasting:** Predicts month-end spending based on moving averages and current daily run-rate.
- **Investments & Net Worth:** Track SIPs and lumpsum investments, calculate per-fund and portfolio-wide **XIRR (Extended Internal Rate of Return)**, and view combined Net Worth.
- **Budgets:** Set limits and track burn-rates visually.
- **Goals:** Track progress toward financial targets.
- **Security:** JWT authentication, bcrypt hashing, Helmet security headers, rate limiting, Joi payload validation.

## Prerequisites

- Node.js (v18+)
- MongoDB Atlas cluster (or local instance)

## Setup & Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Make sure to set your `MONGODB_URI` and a strong `JWT_SECRET`.*

3. **Seed Database (Important!):**
   Run the seed script to create a demo user, categories, sample transactions, budgets, and investments so the dashboard isn't empty.
   ```bash
   npm run seed
   ```

4. **Start the Server:**
   ```bash
   npm run dev
   ```

5. **Access the App:**
   Open `http://localhost:3000` in your browser.
   Login with:
   - Email: `demo@expensetracker.app`
   - Password: `demo123`

## Architecture

- **Backend (`/server`)**: 
  - Express REST API following MVC pattern (`models`, `controllers`, `routes`).
  - Mongoose for ODM.
  - Utilities for complex math (`xirr.js`, `forecast.js`, `anomalyDetection.js`).
- **Frontend (`/public`)**: 
  - Single-page application using vanilla JS modules (`app.js`, `api.js`, etc.).
  - Custom CSS design system with CSS custom properties for theming.
  - Chart.js for data visualization.
  - PWA manifest and basic service worker for installability.

## Advanced Features Implemented (from project brief)

1. **Natural-language quick entry:** Pure client-side parsing regex (`nlp.js`).
2. **Anomaly detection:** Server-side trailing 90-day std-dev calculation (`anomalyDetection.js`).
3. **Investment module:** XIRR and current value calculations (`investmentController.js`, `xirr.js`).
4. **Dark/light theme:** Native CSS variables toggled via DOM (`styles.css`).

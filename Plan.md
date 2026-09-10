# Build Prompt: Personal Expense Tracker & Investment Dashboard

Copy everything below into your coding agent (Claude Code, etc.) as the project brief.

---

## 1. Project Summary

Build a full-stack personal finance web app for a single user (me — an SDE tracking daily expenses in INR while also planning mutual fund investments). Stack: **vanilla HTML/CSS/JS on the frontend** (no framework — keep it lightweight and fully understandable), **Node.js + Express** on the backend, **MongoDB Atlas** as the database. The app should feel as polished and "alive" as a real product, not a tutorial CRUD app — daily use should be fast (log an expense in under 10 seconds) and the dashboard should surface insights I wouldn't get from a spreadsheet.

Non-negotiable constraints:
- No hardcoded secrets anywhere in source. The MongoDB URI is read from `process.env.MONGODB_URI`, loaded via `dotenv` from a `.env` file that is `.gitignore`d. Ship a `.env.example` with placeholder values.
- Mobile-first, responsive, works one-handed on a phone (this is where daily logging will actually happen).
- Every write to the DB must be optimistic-UI (update the screen immediately, roll back on failure) so logging never feels laggy.

---

## 2. Tech Stack & Architecture

- **Frontend:** HTML5, CSS3 (custom properties for theming, CSS Grid/Flexbox, no Bootstrap), vanilla JS (ES modules, `fetch` for API calls). Chart.js (via CDN) for visualizations.
- **Backend:** Node.js, Express, `mongoose` for schema/validation, `dotenv`, `cors`, `helmet`, `express-rate-limit`.
- **Database:** MongoDB Atlas (connection string via env var, name it `MONGODB_URI`).
- **Auth:** JWT-based, single-user to start but design the schema so a `userId` field exists on every document (so it's a 1-line change to go multi-user later). Password hashed with `bcrypt`.
- **Folder structure:**
  ```
  /server
    /models        (Transaction.js, Category.js, Budget.js, Investment.js, User.js, RecurringRule.js)
    /routes
    /controllers
    /middleware     (auth.js, errorHandler.js, validate.js)
    /utils          (forecast.js, anomalyDetection.js, xirr.js)
    server.js
  /public
    /js             (api.js, dashboard.js, transactions.js, charts.js, investments.js, sw.js)
    /css
    index.html
  .env.example
  package.json
  README.md
  ```
- **PWA:** manifest.json + service worker so it's installable and the transaction form works offline (queue writes in IndexedDB, sync when back online).

---

## 3. Data Models

**Transaction**
```
date (Date, required)
amount (Number, required, > 0)
type ("expense" | "income")
category (String, ref to Category)
subcategory (String, optional)
paymentMethod (String: Cash/Credit Card/Debit Card/UPI/Net Banking)
description (String)
tags (Array<String>)
recurringRuleId (ObjectId, optional — links to a RecurringRule if auto-generated)
isAnomaly (Boolean, computed)
createdAt / updatedAt (timestamps)
```

**Category** — name, icon, color, monthlyBudget (Number, optional), isActive.

**RecurringRule** — for subscriptions/rent/EMIs: amount, category, frequency (weekly/monthly/yearly), nextDueDate, autoLog (Boolean — if true, a scheduled job creates the transaction automatically; if false, it just reminds).

**Budget** — category, month, limit, spent (computed, not stored — always derive from Transactions so it can never drift out of sync).

**Investment** (mutual funds) — fundName, folioNumber, type (SIP/lumpsum), amountInvested, units, NAVatPurchase, purchaseDate, currentNAV (fetched or manually updated), for SIPs a `sipDate`/frequency.

**Goal** — name (e.g. "Emergency fund", "Down payment"), targetAmount, targetDate, linkedCategory or linkedInvestment, currentProgress (computed).

---

## 4. Core Features (must-have)

1. **Fast entry form** — date (defaults to today), amount, category (searchable dropdown with icons), payment method, description, optional tags. Big, thumb-friendly submit button. Keyboard shortcut (`n`) to focus the form from anywhere.
2. **Transaction list** — infinite scroll or pagination, filter by date range / category / payment method / tags, full-text search on description, inline edit and delete, undo-delete toast (5s window).
3. **Dashboard** —
   - This month's total spend vs. last month, with % change.
   - Category breakdown (donut chart) with drill-down (click a slice → filtered transaction list).
   - Daily spend calendar heatmap (like a GitHub contribution graph, but for spend intensity).
   - Monthly trend line (last 12 months).
4. **Budgets** — set a monthly limit per category, progress bars that go amber at 80% and red at 100%+, and a running "days left in month vs. budget left" burn-rate indicator.
5. **CSV import/export** — export all transactions to CSV; import a bank/card statement CSV and auto-categorize using a keyword-mapping table (editable by the user) with a review-before-commit step for anything it couldn't confidently categorize.

---

## 5. Advanced / Innovative Features

Pick these up after core features are solid — but design the schema now so none of them require a data-model rewrite later.

1. **Natural-language quick entry** — a single text input where I can type `"paid 450 for lunch on card"` and it parses amount, category (via keyword match against category names/aliases), payment method, and description, pre-filling the form for one-tap confirmation. Pure client-side regex/keyword parsing — no external API needed.
2. **Anomaly detection** — flag any transaction that's more than 2 standard deviations above that category's trailing-90-day average; surface these in a "worth a second look" widget on the dashboard rather than silently.
3. **Spend forecasting** — simple linear regression / moving-average projection of "at this rate, you'll spend ₹X this month," updated daily, shown as a projected line alongside actual spend on the trend chart.
4. **Recurring-transaction detection** — a background job that scans transaction history for repeating amount+category+~30-day-interval patterns and *suggests* creating a RecurringRule (never auto-creates without confirmation).
5. **Investment module** — separate tab for mutual fund SIPs/holdings: log each SIP, compute current value (units × latest NAV — allow manual NAV entry or, as a stretch goal, pull from a free NAV API like AMFI's daily NAV file), show XIRR per fund and for the overall portfolio, and a combined **net worth view** = liquid cash implied by tracked income/expense + investment current value.
6. **Goals with linked funding** — e.g. "Emergency fund: ₹1,00,000 by Dec 2026," progress bar fed either by a tagged savings category or by linked investment contributions.
7. **Logging-streak gamification** — a small, tasteful streak counter ("12-day logging streak") to reinforce the daily habit — not intrusive, just a badge on the dashboard.
8. **Receipt capture (stretch)** — client-side OCR (Tesseract.js) on a photographed receipt to pre-fill amount + merchant name; always leave it editable, never auto-submit.
9. **Dark/light theme** with a `prefers-color-scheme` default and manual toggle, persisted in localStorage.
10. **Weekly email/browser-notification digest** (optional, behind a feature flag) — top categories, budget status, any anomalies.

---

## 6. API Design (REST)

```
POST   /api/auth/login
POST   /api/transactions          GET /api/transactions?from&to&category&paymentMethod&q&page
GET    /api/transactions/:id      PUT /api/transactions/:id     DELETE /api/transactions/:id
GET    /api/categories            POST /api/categories          PUT/DELETE /api/categories/:id
GET    /api/budgets?month=YYYY-MM PUT /api/budgets/:categoryId
GET    /api/dashboard/summary?month=YYYY-MM   (aggregated stats — do the heavy aggregation in Mongo, not client-side)
GET    /api/dashboard/trend?months=12
GET    /api/investments           POST/PUT/DELETE /api/investments/:id
GET    /api/investments/summary   (XIRR, current value, net worth)
GET    /api/goals                 POST/PUT/DELETE /api/goals/:id
POST   /api/import/csv
GET    /api/export/csv
```

Use MongoDB aggregation pipelines for `/dashboard/summary` and `/dashboard/trend` — don't pull raw transactions to the client and sum in JS.

---

## 7. Non-Functional Requirements

- **Validation:** Mongoose schema validation + a server-side `validate` middleware (e.g. via `zod` or `joi`) on every write route — never trust client input.
- **Security:** `helmet`, rate limiting on auth routes, sanitize all inputs against injection, CORS locked to the actual frontend origin in production.
- **Error handling:** centralized Express error handler, consistent JSON error shape `{ error: { message, code } }`.
- **Performance:** indexes on `Transaction.date`, `Transaction.category`, and a compound index on `(date, category)` for the dashboard queries.
- **Testing:** Jest + Supertest for at least the transactions and dashboard-summary routes; a couple of frontend smoke tests are a bonus, not required.
- **Accessibility:** semantic HTML, form labels, sufficient color contrast, keyboard-navigable.
- **Deployment notes:** README should document deploying the backend to something like Render/Railway and the frontend as static hosting, plus the exact env vars needed (`MONGODB_URI`, `JWT_SECRET`, `PORT`).

---

## 8. What to Deliver

1. Working code for all Core Features (Section 4) fully functional end-to-end.
2. At least 3 of the Advanced Features (Section 5) implemented — natural-language entry, anomaly detection, and the investment module are the highest-value picks if you have to choose.
3. A `README.md` with setup steps, env var list, and a short architecture overview.
4. A `.env.example` file — never a real `.env` with committed secrets.
5. Seed script (`npm run seed`) that populates a handful of realistic sample categories and transactions so the dashboard isn't empty on first run.

Build it incrementally: schema + API first, then core UI, then advanced features, verifying each layer works before moving to the next rather than writing everything and debugging at the end.
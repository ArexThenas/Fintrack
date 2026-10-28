# FinTrack — personal finance dashboard

Track income, expenses, budgets and debts, and start UPI payments.
Everything is stored **in your browser** (localStorage). There is no server and no account.

## 1. What you need to install

| Tool | Why | Where |
|------|-----|-------|
| **Node.js 20 or newer (LTS)** | Runs the dev server and installs packages. `npm` comes with it. | https://nodejs.org |
| A modern browser (Chrome, Edge, Firefox, Safari) | To view the app | — |
| *(optional)* VS Code | Comfortable code editor | https://code.visualstudio.com |

Check Node is installed: open a terminal and run `node -v` (should print v20 or higher).

You do **not** download React, Vite, Chart.js etc. by hand — `npm install` fetches them
(listed in `package.json`).

## 2. Run it

```bash
cd fintrack
npm install        # one time: downloads the libraries (needs internet)
npm run dev        # starts the app and opens http://localhost:5173
```

First time in the app? Go to **Settings → Load samples** to fill it with example data.

### Other commands

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build at http://localhost:4173
npm run dev -- --host   # also reachable from your phone on the same Wi-Fi
```

## 3. Project layout

```
index.html            page shell (fonts, favicon, no-flash theme script)
public/favicon.svg    browser tab icon
src/
  main.jsx            entry point
  App.jsx             routes
  index.css           design tokens + base styles (imports styles/*)
  styles/             layout, forms, cards and page styles
  components/         AppLayout (wires everything), Navbar, Sidebar, forms, cards, table
  pages/              Dashboard, Transactions, Budget, Debt, Settings
  charts/             income/expense bars, category doughnut, spending trend
  hooks/              useFinTrackData (all data + saving), small context hooks
  utils/              calculations, storage, dates, format, upi
  data/defaultData.js shared categories, payment methods and sample data
```

How data flows: `AppLayout` calls `useFinTrackData()` and passes data + actions to the
pages through the router's outlet context. Every change is saved to localStorage immediately.

## 4. Notes

* **UPI payments** open a `upi://` link, which works on phones/tablets with a UPI app.
  FinTrack cannot see whether a payment succeeded, so you confirm the result yourself and it
  is recorded as a transaction. Never enter your UPI PIN anywhere except your UPI app.
* **Back up your data** from Settings → Export data. Clearing browser data erases it.
* Clearing site data, using a private window, or switching browsers shows an empty app.

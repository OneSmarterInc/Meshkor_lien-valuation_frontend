# MeshKor Lien Valuation: web portal (frontend)

This repository holds the **web screens** of the MeshKor Lien Valuation portal. Law firms and MeshKor reviewers use these pages in the browser.

**What the portal does:** a law firm uploads a hospital bill. The system prices every line against official public data: the hospital's own insurer rate, the median of its posted rates, its cash price, Medicare and the hospital's cost. A MeshKor reviewer checks the result. The firm then downloads a sourced valuation report (PDF) and a data appendix (CSV), and uses them in a personal-injury case or a lien dispute.

All reading, matching and pricing happens in the backend, **[Meshkor_lien-valuation_backend](https://github.com/OneSmarterInc/Meshkor_lien-valuation_backend)**. Its README explains the whole project: the pricing method, the data sources, the security rules and the setup. This app only shows what the backend returns.

**Rules this app follows:**

- **All data comes from the API.** There is no sample or demo data in the code.
- **It calls only the endpoints in [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).** The backend has the same file.
- **It stores no patient data in the browser.** Only the sign-in token is kept, in `sessionStorage`, so closing the tab signs the user out.

---

## Contents

1. [How it fits in](#1-how-it-fits-in)
2. [Who sees what](#2-who-sees-what)
3. [The workflow on screen](#3-the-workflow-on-screen)
4. [Every page](#4-every-page)
5. [Run it on your PC](#5-run-it-on-your-pc)
6. [Settings (`.env`)](#6-settings-env)
7. [Build and deploy](#7-build-and-deploy)
8. [Code layout](#8-code-layout)
9. [How the code works](#9-how-the-code-works)
10. [Change things safely](#10-change-things-safely)
11. [Troubleshooting](#11-troubleshooting)
12. [Status and next steps](#12-status-and-next-steps)

---

## 1. How it fits in

```
 Browser ──▶ this app (React, http://localhost:5173)
                 │   every request to /api/... 
                 ▼
            Vite dev proxy  ──▶  Django backend (http://localhost:8000)
                                      │
                                      ├── PostgreSQL (users, cases, flags, audit)
                                      ├── encrypted bills and EOBs
                                      └── DuckDB with the CMS rates and hospital price files
```

| Item | Value |
|---|---|
| Framework | React 18.3.1, React Router 6.28.0 |
| Build tool | Vite 5.4.11 (dev server on port 5173) |
| Styles | One plain CSS file (`src/styles.css`), light and dark mode, no CSS framework |
| Login | JWT (Bearer token) from the backend, with one automatic refresh when it expires |
| Other libraries | None. There is no state library and no UI kit. |

---

## 2. Who sees what

The backend gives each user one **role**. The app shows a different menu for each role.

| Role | Who | Menu |
|---|---|---|
| `firm` | A lawyer or paralegal at a law firm | **Upload a bill** · **My reports** |
| `reviewer` | MeshKor staff | **Cases** · **Upload a bill** · **Data sources** · **Audit log** (plus **Review** and **Report & send** inside each case) |
| `admin` | MeshKor staff | Same as reviewer |

**The menu is not the security.** The app hides pages a role cannot use, but the backend is the real guard. A firm user who types another firm's case address gets "not found" from the API.

There is no sign-up page. MeshKor makes the accounts in the backend (`create_portal_user`).

---

## 3. The workflow on screen

On screen, a case has **3 steps: 1 Upload → 2 Review → 3 Report & send.**

**Step 1: Upload** (law firm, or MeshKor staff for a firm)

1. Choose the itemized bill (UB-04 or itemized statement: PDF or image, up to 50 MB). Add the insurer's EOB if you have it.
2. Enter your matter reference and choose who the report is for: plaintiff, defense or lien resolution.
3. Tick **"client consented"**.
4. Send. The backend encrypts the files, gives the case a number (`MK-2026-0001`) and prices the bill at once.

Staff also choose **which law firm** the bill belongs to. The case then shows in that firm's **My reports**, marked **In progress**.

**Step 2: Review** (MeshKor reviewer)

1. Open **Cases**, then the case. The Review page shows the hospital that was found, the price file used, the bill total against each benchmark, every line, and the flags.
2. **Needs a look:** resolve each flag that says "check", with a short note.
3. For an inpatient stay: confirm the **MS-DRG**, or type a different one. The backend prices the stay again at once.

**Step 3: Report & send** (MeshKor reviewer)

1. Preview the report. Download the draft PDF or CSV if needed (the draft PDF is marked DRAFT).
2. **Approve and send:** this works only when no "check" flag is open. The firm gets an email.
3. **Send back:** a note is required. The case goes to "Sent back".

**After release** (law firm)

1. In **My reports**, the case shows **Ready**.
2. Download the **PDF** report and the **CSV** data appendix.
3. Tell MeshKor the outcome (reduced, partly, no change) and a fair price per report.

**Status labels**

| Backend status | Staff see | Firm sees |
|---|---|---|
| `uploaded`, `processing` | Uploaded, Processing | In progress |
| `needs_review` | Needs review | In progress |
| `returned` | Sent back | In progress |
| `no_price_file` | No price file | In progress |
| `error` | Error (with the reason) | Needs attention ("MeshKor is looking at this bill") |
| `sent` | Sent | **Ready** (downloads open) |

---

## 4. Every page

| Address | Page | Role | What it shows and does |
|---|---|---|---|
| `/login` | **Sign in** | everyone | Email and password. After sign-in, a firm user goes to My reports and staff go to Cases. |
| `/upload` | **Upload a bill** | firm, staff | Case details, consent box, bill and EOB file pickers. Staff also pick the law firm. |
| `/my-reports` | **My reports** | firm | The firm's cases: matter, hospital, dates, billed total, status. PDF and CSV buttons when Ready. Feedback form for sent reports. |
| `/cases` | **Cases** | staff | Counts (needs review, processing, sent this month, billed total of open cases), a status filter, search (case, matter, hospital, insurer), and the case list. |
| `/cases/:id/review` | **Review** (step 2) | staff | Hospital match and price file · flags to resolve · bill total against each benchmark · bill lines (switch between "service date" and "estimate" basis) · line detail with every source file and its hash · for inpatient: DRG, diagnoses, stay value, confirm DRG. |
| `/cases/:id/report` | **Report & send** (step 3) | staff | Report preview (summary table, method, limits, sources) · PDF and CSV download · Approve and send · Send back with a note. |
| `/data-sources` | **Data sources** | staff | Every reference table (Medicare, labs, drugs, DRGs, cost reports…) with its release, row count and load state; the hospital price files loaded; the latest verify result. |
| `/audit` | **Audit log** | staff | Every action (sign-in, upload, view, flag decision, approval, download) with time, person and case. |
| anything else | **Page not found** | everyone | A link back to the user's start page |

**Values on screen:**

- `*` or **est.** means **estimate**: a percentage contract, a "% of Medicare" term, or a price file that does not cover the date of service.
- A firm user sees the values, lines and report only after MeshKor releases the case. Before that, the case shows **In progress** (or **Needs attention**).
- **"not posted"** means the hospital posts no cash price. It is never shown as $0.
- **"packaged"** means Medicare pays that line inside another line.
- **Median (commercial)** is the middle of the hospital's rates with **commercial insurers only** (employer, individual and ACA exchange plans, PPO networks). Medicare, Medicare Advantage and Medicaid plans are left out, because Medicare is its own column.

---

## 5. Run it on your PC

**You need:** Node.js LTS (20 or later) from nodejs.org, and the backend running on port 8000 (see the backend README).

```powershell
cd D:\Meshkor
git clone https://github.com/OneSmarterInc/Meshkor_lien-valuation_frontend.git lien-portal-frontend
cd lien-portal-frontend
copy .env.example .env        # the defaults work when the backend is on http://localhost:8000
npm install
npm run dev
```

Open **http://localhost:5173** and sign in with an account made in the backend.

**Each day you need 2 windows:**

| Window | Folder | Command |
|---|---|---|
| 1: backend | `D:\Meshkor\meshkor-data` | `.\.venv\Scripts\Activate.ps1` then `python backend\manage.py runserver 8000` |
| 2: website | `D:\Meshkor\lien-portal-frontend` | `npm run dev` |

**Try the full flow** with the synthetic test bill `tests\fixtures\test_bills\B01_TEST_bill.pdf` from the backend repository. Use only the synthetic test bills until the portal is set up for production. **No real bills on a developer PC.**

**About `npm audit` warnings:** they are in the development tools (Vite and esbuild), not in the code the browser gets. **Do not run `npm audit fix --force`.** It jumps to new major versions and can break the build. Update versions on purpose, then test.

---

## 6. Settings (`.env`)

| Setting | Default | What it does |
|---|---|---|
| `VITE_API_BASE_URL` | empty | Address of the backend for a **built** app, for example `https://api.meshkor.com`. Leave it empty in development, because the dev proxy handles `/api`. |
| `VITE_DEV_API_TARGET` | `http://localhost:8000` | Where the dev server sends `/api/...` requests |

A `VITE_` value is built **into** the app at build time, so it is visible to anyone. **Never put a secret in this file.**

---

## 7. Build and deploy

```powershell
# set VITE_API_BASE_URL in .env first, for example https://api.meshkor.com
npm run build          # makes the dist\ folder
npm run preview        # optional: serves dist\ locally to check it
```

Serve the `dist\` folder from any web server, and send every unknown path to `index.html`, so that React Router can open the page. For nginx:

```nginx
location / { try_files $uri /index.html; }
```

**The backend must then:**

1. Allow the website's address in `CORS_ALLOWED_ORIGINS`.
2. Send the `Content-Disposition` header on downloads, so files keep their names (`MK-…_valuation_report.pdf`).
3. Run on **HTTPS**.

A simple setup is to serve the website and the API from the same domain, with `/api` sent to Django. Then no CORS setup is needed.

---

## 8. Code layout

```
index.html                  page shell
vite.config.js              dev server on 5173, /api proxy to VITE_DEV_API_TARGET
.env.example                copy to .env
public/favicon.svg
docs/API_CONTRACT.md        every endpoint and JSON shape (same file in the backend)
src/
  main.jsx                  starts React: router, sign-in state, toasts
  App.jsx                   all routes and which roles may open them
  api/
    client.js               fetch wrapper: base URL, Bearer token, one refresh on 401, error text, file downloads
    endpoints.js            every backend path in one place (Auth, Cases, Firms, DataSources, Audit)
  auth/
    AuthContext.jsx         who is signed in; homeFor(user) picks the start page; STAFF roles
    RequireRole.jsx         blocks a page for the wrong role, sends a signed-out user to /login
  components/
    Layout.jsx              top bar and menu by role, sign-out
    States.jsx              loading, error and empty states; useLoad() hook for API calls
    Toast.jsx               small messages ("Downloaded …", "Saved")
    UI.jsx                  Stat tiles, benchmark bars, Pill labels, ActionButton (busy state, errors)
  pages/
    Login.jsx
    UploadBill.jsx          firm and staff
    NotFound.jsx
    firm/MyReports.jsx      firm: list, downloads, feedback
    staff/Cases.jsx         staff: counts, filter, search, list
    staff/CaseHeader.jsx    case title, status and the 3-step bar
    staff/Review.jsx        step 2
    staff/Report.jsx        step 3
    staff/DataSources.jsx
    staff/AuditLog.jsx
  utils/format.js           money, dates, ranges, short hashes, status labels for staff and firm
  styles.css                all styles
```

---

## 9. How the code works

**Sign-in**

1. `Login.jsx` posts the email and password to `/api/auth/login/`.
2. The backend returns `access`, `refresh` and `user` (with `role` and `firm`).
3. `client.js` stores them in `sessionStorage`. Every request then sends `Authorization: Bearer <access>`.
4. On a `401`, `client.js` calls `/api/auth/refresh/` **once**, then repeats the request. If that also fails, the user is signed out.
5. Sign-out calls `/api/auth/logout/`, which blocks the refresh token on the server, then clears the browser session.

**Loading data:** every page uses `useLoad()` from `States.jsx`. It shows a loading state, then the data, or an error with a retry button. Errors show the backend's `detail` text, or the first field message.

**Downloads:** `client.js` fetches the file with the token, reads the file name from `Content-Disposition`, and saves it. A firm can download only when the case is `sent`. The backend checks this, and logs every download.

**Lists:** the backend pages its lists (`{count, next, previous, results}`, 25 per page).

---

## 10. Change things safely

| To change | Edit |
|---|---|
| An API path | `src/api/endpoints.js` only |
| A status label or color | `STAFF_STATUS` / `statusFirm` in `src/utils/format.js` |
| Who may open a page | the `roles` on that route in `src/App.jsx`, **and** the permission in the backend |
| Money or date format | `src/utils/format.js` |
| Colors, spacing, dark mode | `src/styles.css` |
| A new endpoint or a new JSON field | `docs/API_CONTRACT.md` **in both repositories** first, then the backend, then this app |

Keep the app free of sample data. When the backend has nothing to show, the page shows an empty state.

---

## 11. Troubleshooting

| You see | Cause | Fix |
|---|---|---|
| "The server had a problem. Try again in a minute." | The backend is not running, or it stopped with an error | Look at backend Window 1. Start it again; if it stops by itself, run `runserver 8000 --noreload` and read the error. |
| Sign-in says "Wrong email or password." | Wrong details, or the user does not exist | Make or reset the user with `create_portal_user` in the backend |
| Every page sends you back to sign-in | The refresh token expired (12 hours by default), or the tab was closed | Sign in again |
| A case stays "Error" | The bill has no text layer (a scan), or the hospital was not found | Open the case: the reason is shown. See the backend README, section 13. |
| A case stays "No price file" | That hospital's price file is not loaded yet | Load it in the backend, then run `reprocess_case` |
| `npm` is not recognized | Node.js is not installed, or the window is older than the install | Install Node.js LTS, then open a new window |
| Downloads save without a proper name (production) | CORS does not expose `Content-Disposition` | Expose that header in the backend CORS settings |

---

## 12. Status and next steps

**Works today:**

- Sign-in with roles
- Upload with consent
- Case list with counts and search
- Review with flags, line sources and DRG confirmation
- Report preview
- Approve or send back
- PDF and CSV downloads
- Firm feedback
- Data sources and audit log pages

**Next:**

| Item | Note |
|---|---|
| Admin pages | Make users and firms from the portal instead of the command line |
| Designed PDF report | Today the PDF is a simple one-column layout from the backend |
| Upload progress | A progress bar for large files |
| Dependency updates | Update Vite and plugins on purpose, then test the build |
| Production | Build with `VITE_API_BASE_URL`, serve over HTTPS, same domain as the API if possible |

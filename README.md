# MeshKor Lien Valuation: web portal (frontend)

React 18 + Vite + React Router. It talks only to the backend API described in **`docs/API_CONTRACT.md`**. All data comes from the API; there is no sample data in the app.

## Run it

```powershell
cd lien-portal-frontend
copy .env.example .env        # then edit if the API is not on http://localhost:8000
npm install
npm run dev                   # http://localhost:5173
```

In development, every request to `/api/...` is passed to `VITE_DEV_API_TARGET` (default `http://localhost:8000`, the Django backend), so CORS is not needed locally.

## Build for a server

```powershell
npm run build                 # output in dist/
```

Set `VITE_API_BASE_URL` (for example `https://api.meshkor.com`) in `.env` **before** the build. Serve `dist/` from any web server, and send every unknown path to `index.html` (React Router handles the pages). For example, with Django serving it, or nginx: `try_files $uri /index.html;`.

## Who sees what

| Account role (from the API) | Pages |
|---|---|
| `firm` (law firm user) | Upload a bill · My reports (status, PDF / CSV download, feedback) |
| `reviewer`, `admin` (MeshKor) | Cases · Upload a bill · Review · Report & send · Data sources · Audit log |

A case has 3 steps on screen: **1 Upload → 2 Review → 3 Report & send**. Reading the bill, matching the hospital and pricing the lines all run in the backend; Review shows only the result and the flags that need a person.

## Folder layout

```
src/
  api/client.js        fetch wrapper: base URL, JWT, refresh on 401, errors, downloads
  api/endpoints.js     every backend path (change paths here only)
  auth/                sign-in state, route guard by role
  components/          layout, toasts, loading / error / empty states, small UI parts
  pages/Login.jsx
  pages/UploadBill.jsx           firm + staff
  pages/firm/MyReports.jsx       firm
  pages/staff/Cases.jsx          staff: list + counts
  pages/staff/Review.jsx         staff: step 2
  pages/staff/Report.jsx         staff: step 3, downloads, approve / send back
  pages/staff/DataSources.jsx    staff
  pages/staff/AuditLog.jsx       staff
  styles.css                     all styles (light and dark)
docs/API_CONTRACT.md   what the backend must return
```

## For the backend developer

1. Implement the endpoints in `docs/API_CONTRACT.md` (same paths, JSON keys and status values).
2. Auth is JWT (Bearer). `djangorestframework-simplejwt` fits: login returns `access`, `refresh` and `user` (with `role` and `firm`).
3. Return `401` (not `403`) for an expired token, so the app can refresh it.
4. In production, allow the frontend origin in CORS and expose `Content-Disposition` for downloads.
5. Firm users must only ever get their own firm's cases. The app hides other menus, but the API is the real guard.

## Notes

- The session is kept in `sessionStorage`, so closing the browser tab signs the user out.
- Downloads use the signed-in token and save the file under the name in the server's `Content-Disposition` header.

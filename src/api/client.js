// Thin fetch wrapper: base URL, JWT bearer token, one automatic refresh on 401,
// readable errors, JSON / multipart bodies and authenticated file downloads.
// Endpoint paths live in endpoints.js; see docs/API_CONTRACT.md.

const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const KEY = "mk_auth";

let session = load();
let onLogout = () => {};

function load() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch { return null; }
}
function save(s) {
  session = s;
  try { s ? sessionStorage.setItem(KEY, JSON.stringify(s)) : sessionStorage.removeItem(KEY); } catch { /* storage blocked */ }
}

export const auth = {
  get: () => session,
  set: (s) => save(s),
  clear: () => save(null),
  onLogout: (fn) => { onLogout = fn; },
};

export class ApiError extends Error {
  constructor(status, message, data) { super(message); this.status = status; this.data = data; }
}

function messageFrom(data, status) {
  if (!data) return status >= 500 ? "The server had a problem. Try again in a minute." : `Request failed (${status}).`;
  if (typeof data === "string") {
    // An HTML error page from the server: show a plain message, not the markup.
    if (/^\s*<(!doctype|html)/i.test(data)) return status >= 500 ? "The server had a problem. Check the backend window for the error." : `Request failed (${status}).`;
    return data;
  }
  if (data.detail) return data.detail;
  const first = Object.entries(data).find(([, v]) => v);
  if (first) return `${first[0].replace(/_/g, " ")}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}`;
  return `Request failed (${status}).`;
}

let refreshing = null;
async function refresh() {
  if (!session?.refresh) return false;
  refreshing ||= fetch(`${BASE}/api/auth/refresh/`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: session.refresh }),
  }).then(async (r) => {
    if (!r.ok) return false;
    const d = await r.json();
    save({ ...session, access: d.access, refresh: d.refresh || session.refresh });
    return true;
  }).catch(() => false).finally(() => { refreshing = null; });
  return refreshing;
}

async function raw(path, { method = "GET", body, form, headers = {}, retry = true } = {}) {
  const h = { Accept: "application/json", ...headers };
  if (session?.access) h.Authorization = `Bearer ${session.access}`;
  let payload;
  if (form) payload = form;                       // FormData: browser sets the boundary
  else if (body !== undefined) { h["Content-Type"] = "application/json"; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers: h, body: payload });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection.");
  }
  const noRefresh = /^\/api\/auth\/(login|refresh|mfa\/(setup|confirm|verify))\//.test(path);   // steps of a sign-in
  if (res.status === 401 && retry && session?.refresh && !noRefresh) {
    if (await refresh()) return raw(path, { method, body, form, headers, retry: false });
    save(null); onLogout();
    throw new ApiError(401, "Your session has ended. Please sign in again.");
  }
  return res;
}

export async function api(path, opts) {
  const res = await raw(path, opts);
  if (res.status === 204) return null;
  const type = res.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await res.json().catch(() => null) : await res.text();
  if (!res.ok) throw new ApiError(res.status, messageFrom(data, res.status), data);
  return data;
}

// Authenticated download: fetch the file, then save it under the server's file name.
export async function download(path, fallbackName) {
  const res = await raw(path, { headers: { Accept: "*/*" } });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, messageFrom(data, res.status), data);
  }
  const cd = res.headers.get("content-disposition") || "";
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  const name = m ? decodeURIComponent(m[1]) : fallbackName;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return name;
}

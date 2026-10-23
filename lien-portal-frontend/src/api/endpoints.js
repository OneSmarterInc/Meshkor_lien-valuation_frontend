// Every backend call in one place. Paths and payloads follow docs/API_CONTRACT.md.
import { api, download } from "./client.js";

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const Auth = {
  login: (email, password) => api("/api/auth/login/", { method: "POST", body: { email, password } }),
  me: () => api("/api/auth/me/"),
  logout: (refresh) => api("/api/auth/logout/", { method: "POST", body: { refresh } }),
};

export const Cases = {
  list: (params) => api(`/api/cases/${qs(params)}`),
  stats: () => api("/api/cases/stats/"),
  create: (form) => api("/api/cases/", { method: "POST", form }),
  get: (id) => api(`/api/cases/${id}/`),
  lines: (id, basis = "service_date") => api(`/api/cases/${id}/lines/${qs({ basis })}`),
  resolveFlag: (id, flagId, note) => api(`/api/cases/${id}/flags/${flagId}/resolve/`, { method: "POST", body: { note } }),
  confirmDrg: (id, ms_drg) => api(`/api/cases/${id}/drg/confirm/`, { method: "POST", body: { ms_drg } }),
  report: (id) => api(`/api/cases/${id}/report/`),
  approve: (id, note) => api(`/api/cases/${id}/approve/`, { method: "POST", body: { note } }),
  sendBack: (id, note) => api(`/api/cases/${id}/return/`, { method: "POST", body: { note } }),
  feedback: (id, body) => api(`/api/cases/${id}/feedback/`, { method: "POST", body }),
  downloadPdf: (c) => download(`/api/cases/${c.id}/report.pdf`, `${c.case_number}_valuation_report.pdf`),
  downloadCsv: (c) => download(`/api/cases/${c.id}/report.csv`, `${c.case_number}_data_appendix.csv`),
};

export const Firms = { list: () => api("/api/firms/") };
export const DataSources = { get: () => api("/api/data-sources/") };
export const Audit = { list: (params) => api(`/api/audit/${qs(params)}`) };

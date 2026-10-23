export const money = (n) =>
  n === null || n === undefined || Number.isNaN(Number(n))
    ? "–"
    : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const int = (n) => (n === null || n === undefined ? "–" : Number(n).toLocaleString("en-US"));

export const ratio = (a, b) => (a && b ? `${(a / b).toFixed(1)}×` : "–");

export const pct = (a, b) => (a && b ? `${Math.round((a / b) * 100)}%` : "–");

export const date = (d) => (d ? String(d).slice(0, 10) : "–");

export const dateTime = (d) => {
  if (!d) return "–";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return String(d);
  return x.toLocaleString("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export const range = (a, b) => (!a ? "–" : !b || a === b ? date(a) : `${date(a)} → ${date(b)}`);

export const bytes = (n) => {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
};

export const shortHash = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-4)}` : "–");

// Case status → label and pill colour, separately for staff and firm users.
const STAFF_STATUS = {
  uploaded: ["Uploaded", "p-mute"],
  processing: ["Processing", "p-mute"],
  needs_review: ["Needs review", "p-warn"],
  returned: ["Sent back", "p-warn"],
  no_price_file: ["No price file", "p-bad"],
  error: ["Error", "p-bad"],
  sent: ["Sent", "p-good"],
};
export const statusStaff = (s) => STAFF_STATUS[s] || [s || "Unknown", "p-mute"];
export const statusFirm = (s) => (s === "sent" ? ["Ready", "p-good"] : ["In progress", "p-mute"]);

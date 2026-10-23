import { useState } from "react";
import { useToast } from "./Toast.jsx";

export function Pill({ children, tone = "p-mute" }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <span className="v">{value}</span>
      {note && <span className="note">{note}</span>}
    </div>
  );
}

// Horizontal bars, all on one scale (the largest value = full width).
export function Bars({ rows }) {
  const max = Math.max(...rows.map((r) => r.value || 0), 1);
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar" key={r.label}>
          <span>{r.label}</span>
          <div className="track"><div className={`fill ${r.muted ? "billed" : ""}`} style={{ width: `${((r.value || 0) / max) * 100}%` }} /></div>
          <span className="val num">{r.display}</span>
        </div>
      ))}
    </div>
  );
}

// Button that runs an async action, shows "working", and reports errors in a toast.
export function ActionButton({ action, children, className = "btn", okText, disabled, ...rest }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const run = async () => {
    setBusy(true);
    try {
      const r = await action();
      if (okText) toast(typeof okText === "function" ? okText(r) : okText);
    } catch (e) {
      toast(e.message || "Something went wrong.", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className={className} onClick={run} disabled={busy || disabled} {...rest}>
      {busy ? "Working…" : children}
    </button>
  );
}

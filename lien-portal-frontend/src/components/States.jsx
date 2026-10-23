import { useCallback, useEffect, useRef, useState } from "react";

export function Loading({ text = "Loading" }) {
  return <div className="state" role="status"><span className="spinner" aria-hidden="true" />{text}…</div>;
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="callout bad" role="alert">
      <strong>{error.message || String(error)}</strong>
      {onRetry && <button className="btn ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, children }) {
  return <div className="empty"><strong>{title}</strong>{children && <span className="note">{children}</span>}</div>;
}

// Load data from an async function; returns { data, error, loading, reload, setData }.
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const alive = useRef(true);
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => alive.current && setState({ data, error: null, loading: false }),
      (error) => alive.current && setState({ data: null, error, loading: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { alive.current = true; run(); return () => { alive.current = false; }; }, [run]);
  const setData = (d) => setState((s) => ({ ...s, data: typeof d === "function" ? d(s.data) : d }));
  return { ...state, reload: run, setData };
}

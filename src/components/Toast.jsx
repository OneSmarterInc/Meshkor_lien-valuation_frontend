import { createContext, useCallback, useContext, useRef, useState } from "react";

const Ctx = createContext(() => {});

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const t = useRef();
  const show = useCallback((text, kind = "ok") => {
    setMsg({ text, kind });
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 3200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && <div className={`toast ${msg.kind === "error" ? "err" : ""}`} role="status">{msg.text}</div>}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

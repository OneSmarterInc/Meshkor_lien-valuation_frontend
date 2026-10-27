import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "../api/client.js";
import { Auth } from "../api/endpoints.js";

const Ctx = createContext(null);
export const STAFF = ["reviewer", "admin"];
export const isStaff = (u) => !!u && STAFF.includes(u.role);
export const isAdmin = (u) => !!u && u.role === "admin";
export const homeFor = (u) => (u?.must_change_password ? "/password" : isStaff(u) ? "/cases" : "/my-reports");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => auth.get()?.user || null);
  const [checking, setChecking] = useState(!!auth.get());

  // Confirm a stored session is still valid on load.
  useEffect(() => {
    if (!auth.get()) return;
    Auth.me()
      .then((u) => { auth.set({ ...auth.get(), user: u }); setUser(u); })
      .catch(() => { auth.clear(); setUser(null); })
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => { auth.onLogout(() => setUser(null)); }, []);

  const login = useCallback(async (email, password) => {
    const d = await Auth.login(email, password);
    auth.set({ access: d.access, refresh: d.refresh, user: d.user });
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    const r = auth.get()?.refresh;
    try { if (r) await Auth.logout(r); } catch { /* ignore: we sign out locally anyway */ }
    auth.clear();
    setUser(null);
  }, []);

  // After a password change: keep the session, take the new user object.
  const updateUser = useCallback((u) => { auth.set({ ...auth.get(), user: u }); setUser(u); }, []);

  const value = useMemo(() => ({ user, checking, login, logout, updateUser }), [user, checking, login, logout, updateUser]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

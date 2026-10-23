import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      const from = loc.state?.from;
      nav(from && from !== "/login" ? from : homeFor(u), { replace: true });
    } catch (err) {
      setError(err.status === 401 ? "Wrong email or password." : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">MK</div>
          <div>MeshKor Lien Valuation<small>Hospital bill benchmarks for injury cases</small></div>
        </div>
        <h1>Sign in</h1>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="callout bad" role="alert">{error}</div>}
        <button className="btn primary wide" type="submit" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in"}</button>
        <p className="note">Law firms and MeshKor staff use the same sign-in. Your account decides what you see. To get an account, contact MeshKor.</p>
      </form>
    </div>
  );
}

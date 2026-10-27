import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "../api/endpoints.js";
import { homeFor, useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";

// Every user. Forced after an admin made the account or reset the password.
export default function ChangePassword() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const forced = !!user?.must_change_password;
  const ok = cur && pw.length >= 8 && pw === pw2;

  const submit = async (e) => {
    e.preventDefault();
    if (!ok) return;
    setBusy(true); setError(null);
    try {
      const u = await Auth.changePassword(cur, pw);
      updateUser(u);
      toast("Your password is changed.");
      nav(homeFor(u), { replace: true });
    } catch (err) {
      setError(err.data?.new_password ? err.data.new_password.join(" ") : err.message);
    } finally { setBusy(false); }
  };

  return (
    <form className="view" onSubmit={submit}>
      <div className="head"><div>
        <h1>{forced ? "Choose your own password" : "Change password"}</h1>
        <p>{forced ? "You signed in with a temporary password from MeshKor. Choose your own password to continue." : "Use at least 8 characters. A long phrase is best."}</p>
      </div></div>
      <div className="panel narrow">
        <div className="field"><label className="label" htmlFor="cur">{forced ? "Temporary password" : "Current password"}</label>
          <input id="cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
        <div className="field"><label className="label" htmlFor="pw">New password</label>
          <input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <span className="note">At least 8 characters; not only numbers; not a common password.</span></div>
        <div className="field"><label className="label" htmlFor="pw2">New password again</label>
          <input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          {pw2 && pw !== pw2 && <span className="note bad-text">The two passwords are not the same.</span>}</div>
        {error && <div className="callout bad" role="alert">{error}</div>}
        <div className="row end"><button className="btn primary" type="submit" disabled={!ok || busy}>{busy ? "Saving…" : "Save password"}</button></div>
      </div>
    </form>
  );
}

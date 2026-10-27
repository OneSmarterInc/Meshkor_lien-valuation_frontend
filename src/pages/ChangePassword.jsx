import { useState } from "react";
import { useLoad } from "../components/States.jsx";
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
        <h1>{forced ? "Choose your own password" : "Password and two-step sign-in"}</h1>
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
      {!forced && <TwoStep />}
    </form>
  );
}

// Two-step sign-in status, and new recovery codes (the old ones stop working).
function TwoStep() {
  const { data } = useLoad(() => Auth.mfaStatus(), []);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const make = async () => {
    setBusy(true); setError(null);
    try { setCodes((await Auth.newRecoveryCodes(code)).recovery_codes); setCode(""); }
    catch (err) { setError(err.data?.code ? err.data.code[0] : err.message); } finally { setBusy(false); }
  };
  return (
    <div className="panel narrow">
      <h2>Two-step sign-in</h2>
      {data.enabled ? (
        <>
          <p className="note">On (Google Authenticator) since {String(data.confirmed_at).slice(0, 10)}. Recovery codes left: <b>{data.recovery_codes_left}</b> of 10.</p>
          {codes ? (
            <><p className="note">Your new recovery codes. The old ones no longer work. Shown only now:</p>
              <ol className="recovery">{codes.map((c) => <li key={c} className="mono">{c}</li>)}</ol></>
          ) : (
            <>
              <div className="field"><label className="label" htmlFor="rc-code">To make new recovery codes, type a current 6-digit code</label>
                <input id="rc-code" inputMode="numeric" className="code-input" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
              {error && <div className="callout bad" role="alert">{error}</div>}
              <div className="row end"><button type="button" className="btn" disabled={code.length !== 6 || busy} onClick={make}>{busy ? "Making…" : "Make new recovery codes"}</button></div>
            </>
          )}
          <p className="note">New phone? Ask a MeshKor admin to reset your two-step sign-in, then set it up again at the next sign-in.</p>
        </>
      ) : <p className="note">Not set up yet. You set it up at your next sign-in.</p>}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Auth } from "../api/endpoints.js";
import { homeFor, useAuth } from "../auth/AuthContext.jsx";

// Sign-in in steps: password → (first time) set up Google Authenticator → 6-digit code.
// Every role uses two-step sign-in; the server decides which step comes next.

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">MK</div>
      <div>MeshKor Lien Valuation<small>Hospital bill benchmarks for injury cases</small></div>
    </div>
  );
}

function CodeInput({ value, onChange, recovery, autoFocus = true }) {
  const ref = useRef(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus, recovery]);
  return recovery ? (
    <input ref={ref} id="code" className="code-input" autoComplete="off" spellCheck="false" placeholder="abcd-efgh"
           value={value} onChange={(e) => onChange(e.target.value.trim().slice(0, 9))} />
  ) : (
    <input ref={ref} id="code" className="code-input" inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
           value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))} />
  );
}

function RecoveryCodes({ codes, onDone }) {
  const [saved, setSaved] = useState(false);
  const text = `MeshKor Lien Valuation: recovery codes\nEach code works once, in place of the 6-digit code.\n\n${codes.join("\n")}\n`;
  const copy = async () => { try { await navigator.clipboard.writeText(text); } catch { /* select by hand */ } };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a"); a.href = url; a.download = "meshkor-recovery-codes.txt"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <h1>Save your recovery codes</h1>
      <p className="note">If you lose your phone, each code lets you sign in once instead of the 6-digit code. They are shown only now. Keep them somewhere safe and private, apart from your password.</p>
      <ol className="recovery">{codes.map((c) => <li key={c} className="mono">{c}</li>)}</ol>
      <div className="row"><button type="button" className="btn" onClick={copy}>Copy</button><button type="button" className="btn" onClick={download}>Download .txt</button></div>
      <label className="check"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> <span>I have saved these codes.</span></label>
      <button className="btn primary wide" type="button" disabled={!saved} onClick={onDone}>Continue</button>
    </>
  );
}

export default function Login() {
  const { user, login, finish } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [step, setStep] = useState("password");        // password | setup | verify | codes
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(null);
  const [setup, setSetup] = useState(null);             // {qr_svg, secret_grouped, account, issuer}
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [codes, setCodes] = useState(null);
  const [pending, setPending] = useState(null);         // sign-in result held while the codes are shown
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user && step !== "codes") return <Navigate to={homeFor(user)} replace />;

  const go = (u) => { const from = loc.state?.from; nav(from && from !== "/login" && !u.must_change_password ? from : homeFor(u), { replace: true }); };
  const restart = (msg) => { setStep("password"); setToken(null); setSetup(null); setCode(""); setRecovery(false); setError(msg || null); };
  const fail = (err) => {
    if (err.status === 401 && step !== "password") return restart("The sign-in step has expired. Sign in again.");
    setError(err.status === 401 ? "Wrong email or password." : err.data?.code ? err.data.code[0] : err.message);
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      const r = await login(email.trim(), password);
      if (!r.mfa) return go(r);
      setToken(r.mfa_token); setCode(""); setPassword("");
      if (r.mfa === "setup") { setSetup(await Auth.mfaSetup(r.mfa_token)); setStep("setup"); } else setStep("verify");
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      if (step === "setup") {
        const d = await Auth.mfaConfirm(token, code);
        setPending(d); setCodes(d.recovery_codes); setStep("codes");
      } else {
        const d = await Auth.mfaVerify(token, code);
        go(finish(d));
      }
    } catch (err) { setCode(""); fail(err); } finally { setBusy(false); }
  };

  const codeOk = recovery ? code.replace(/[^a-z0-9]/gi, "").length === 8 : code.length === 6;

  return (
    <div className="login-page">
      {step === "password" && (
        <form className="login-card" onSubmit={submitPassword} noValidate>
          <Brand />
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
          <button className="btn primary wide" type="submit" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Continue"}</button>
          <p className="note">Law firms and MeshKor staff use the same sign-in. After your password, you enter a code from Google Authenticator on your phone. To get an account, contact MeshKor.</p>
        </form>
      )}

      {step === "setup" && setup && (
        <form className="login-card wide-card" onSubmit={submitCode} noValidate>
          <Brand />
          <h1>Set up two-step sign-in</h1>
          <p className="note">This protects the patient information in the portal. You do it once; it takes 2 minutes.</p>
          <ol className="steps">
            <li>On your phone, install <b>Google Authenticator</b> (free, from the App Store or Google Play). Microsoft Authenticator or Authy also work.</li>
            <li>In the app, tap <b>+</b>, then <b>Scan a QR code</b>, and scan this code:
              <div className="qr"><img src={setup.qr_svg} alt="QR code for Google Authenticator" width="200" height="200" /></div>
              <button type="button" className="btn ghost small" onClick={() => setShowKey((x) => !x)}>{showKey ? "Hide the key" : "Can't scan? Type a key instead"}</button>
              {showKey && <div className="key-box"><span className="note">In the app: <b>Enter a setup key</b>. Account: {setup.account}. Key (time based):</span><code className="mono">{setup.secret_grouped}</code></div>}
            </li>
            <li>Type the 6-digit code the app shows for <b>{setup.issuer}</b>:</li>
          </ol>
          <div className="field"><label className="label" htmlFor="code">6-digit code</label><CodeInput value={code} onChange={setCode} /></div>
          {error && <div className="callout bad" role="alert">{error}</div>}
          <button className="btn primary wide" type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Turn on two-step sign-in"}</button>
          <button type="button" className="btn ghost wide" onClick={() => restart()}>Back</button>
        </form>
      )}

      {step === "verify" && (
        <form className="login-card" onSubmit={submitCode} noValidate>
          <Brand />
          <h1>Enter your code</h1>
          <p className="note">{recovery ? "Type one of the recovery codes you saved when you set up two-step sign-in. Each works once." : "Open Google Authenticator on your phone and type the 6-digit code for MeshKor Lien Valuation."}</p>
          <div className="field"><label className="label" htmlFor="code">{recovery ? "Recovery code" : "6-digit code"}</label><CodeInput value={code} onChange={setCode} recovery={recovery} /></div>
          {error && <div className="callout bad" role="alert">{error}</div>}
          <button className="btn primary wide" type="submit" disabled={busy || !codeOk}>{busy ? "Checking…" : "Sign in"}</button>
          <button type="button" className="btn ghost wide" onClick={() => { setRecovery((x) => !x); setCode(""); setError(null); }}>
            {recovery ? "Use the 6-digit code" : "Lost your phone? Use a recovery code"}</button>
          <p className="note">No phone and no recovery codes? Ask a MeshKor admin to reset your two-step sign-in.</p>
          <button type="button" className="btn ghost wide" onClick={() => restart()}>Back</button>
        </form>
      )}

      {step === "codes" && codes && (
        <div className="login-card wide-card"><Brand /><RecoveryCodes codes={codes} onDone={() => go(finish(pending))} /></div>
      )}
    </div>
  );
}

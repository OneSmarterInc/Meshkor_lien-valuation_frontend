import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Admin } from "../../api/endpoints.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { Empty, ErrorBox, Loading, useLoad } from "../../components/States.jsx";
import { Pill } from "../../components/UI.jsx";
import { useToast } from "../../components/Toast.jsx";
import { dateTime } from "../../utils/format.js";

const ROLES = [
  ["firm", "Law firm user", "Uploads bills; sees only their own firm's reports, after MeshKor releases them."],
  ["reviewer", "MeshKor reviewer", "Reviews every firm's cases; approves and sends reports."],
  ["admin", "MeshKor admin", "Everything a reviewer does, plus law firms, users and payer names."],
];
const roleName = (r) => (ROLES.find((x) => x[0] === r) || [r, r])[1];

// The one-time password, shown once after "add" or "reset".
function TempPassword({ who, pw, onClose }) {
  const toast = useToast();
  const copy = async () => { try { await navigator.clipboard.writeText(pw); toast("Copied."); } catch { toast("Select the password and copy it.", "error"); } };
  return (
    <div className="callout info temp-pw" role="status">
      <div><strong>Temporary password for {who}</strong>
        <div className="note">Shown only now. Give it to the user by phone or in person, not in the same email as the portal address. They must choose their own password when they sign in.</div></div>
      <code className="mono pw">{pw}</code>
      <div className="row"><button type="button" className="btn small" onClick={copy}>Copy</button><button type="button" className="btn small" onClick={onClose}>Done</button></div>
    </div>
  );
}

function UserForm({ user, firms, onDone, onCancel }) {
  const toast = useToast();
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.name && user.name !== user.email ? user.name : "");
  const [role, setRole] = useState(user?.role || "firm");
  const [firmId, setFirmId] = useState(user?.firm?.id ? String(user.firm.id) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ok = email.includes("@") && (role !== "firm" || firmId);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const body = { email: email.trim(), name: name.trim(), role, firm_id: role === "firm" ? Number(firmId) : null };
    try {
      const u = user ? await Admin.updateUser(user.id, body) : await Admin.addUser(body);
      toast(user ? `${u.email} saved.` : `${u.email} added.`);
      onDone(u);
      if (!user) { setEmail(""); setName(""); }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const idp = user?.id || "new";
  return (
    <form className={user ? "edit-row" : "panel"} onSubmit={save}>
      {!user && <h2>Add a user</h2>}
      <div className="grid4">
        <div className="field"><label className="label" htmlFor={`ue-${idp}`}>Email (sign-in name)</label>
          <input id={`ue-${idp}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label className="label" htmlFor={`un-${idp}`}>Full name</label>
          <input id={`un-${idp}`} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label className="label" htmlFor={`ur-${idp}`}>Role</label>
          <select id={`ur-${idp}`} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select></div>
        <div className="field"><label className="label" htmlFor={`uf-${idp}`}>Law firm</label>
          <select id={`uf-${idp}`} value={role === "firm" ? firmId : ""} disabled={role !== "firm"} onChange={(e) => setFirmId(e.target.value)}>
            <option value="">{role === "firm" ? "Choose" : "MeshKor staff: no firm"}</option>
            {firms.filter((f) => f.active || String(f.id) === firmId).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select></div>
      </div>
      <p className="note">{ROLES.find((r) => r[0] === role)?.[2]}</p>
      {error && <div className="callout bad" role="alert">{error}</div>}
      <div className="row end">
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
        <button className="btn primary" type="submit" disabled={!ok || busy}>{busy ? "Saving…" : user ? "Save" : "Add user"}</button>
      </div>
    </form>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const role = sp.get("role") || "";
  const firm = sp.get("firm") || "";
  const firms = useLoad(() => Admin.firms(), []);
  const { data, error, loading, reload, setData } = useLoad(() => Admin.users({ role, firm }), [role, firm]);
  const [editing, setEditing] = useState(null);
  const [temp, setTemp] = useState(null);
  const put = (u) => setData((list) => { const i = list.findIndex((x) => x.id === u.id); return i < 0 ? [...list, u] : list.map((x) => (x.id === u.id ? u : x)); });
  const added = (u) => { put(u); if (u.temporary_password) setTemp({ who: u.email, pw: u.temporary_password }); };
  const reset = async (u) => {
    try { const r = await Admin.resetPassword(u.id); setTemp({ who: u.email, pw: r.temporary_password }); toast(`${u.email} is signed out everywhere.`); }
    catch (err) { toast(err.message, "error"); }
  };
  const resetMfa = async (u) => {
    try { put(await Admin.resetMfa(u.id)); toast(`Two-step sign-in reset for ${u.email}. They set it up again at the next sign-in.`); }
    catch (err) { toast(err.message, "error"); }
  };
  const toggle = async (u) => {
    try { put(await Admin.updateUser(u.id, { active: !u.active })); toast(u.active ? `${u.email} is turned off and signed out.` : `${u.email} is on again.`); }
    catch (err) { toast(err.message, "error"); }
  };
  const filter = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const fl = firms.data || [];

  return (
    <section className="view">
      <div className="head"><div><h1>Users</h1><p>Everyone who can sign in. A new user gets a temporary password, sets up Google Authenticator and chooses their own password at the first sign-in. Every change is in the audit log.</p></div></div>
      {temp && <TempPassword {...temp} onClose={() => setTemp(null)} />}
      <UserForm firms={fl} onDone={added} />
      <div className="panel">
        <div className="row between">
          <h2>All users</h2>
          <div className="row">
            <select aria-label="Role" value={role} onChange={(e) => filter("role", e.target.value)}>
              <option value="">Every role</option>{ROLES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
            <select aria-label="Firm" value={firm} onChange={(e) => filter("firm", e.target.value)}>
              <option value="">Every firm</option>{fl.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
        <ErrorBox error={error} onRetry={reload} />
        {loading && !data && <Loading text="Loading users" />}
        {data && (data.length === 0 ? <Empty title="No users match." /> : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Firm</th><th>Last sign-in</th><th>2FA</th><th>Status</th><th /></tr></thead>
            <tbody>{data.map((u) => (editing === u.id ? (
              <tr key={u.id}><td colSpan="8"><UserForm user={u} firms={fl} onDone={(n) => { put(n); setEditing(null); }} onCancel={() => setEditing(null)} /></td></tr>
            ) : (
              <tr key={u.id}>
                <td><strong>{u.name}</strong>{u.id === me.id && <span className="note"> (you)</span>}</td>
                <td>{u.email}</td>
                <td>{roleName(u.role)}</td>
                <td>{u.firm?.name || <span className="note">MeshKor</span>}</td>
                <td className="mono">{u.last_login ? dateTime(u.last_login) : <span className="note">never</span>}</td>
                <td>{u.mfa_enabled ? <Pill tone="p-good">On</Pill> : <Pill tone="p-warn">Not set up</Pill>}</td>
                <td>{!u.active ? <Pill tone="p-mute">Turned off</Pill> : u.must_change_password ? <Pill tone="p-warn">Temporary password</Pill> : <Pill tone="p-good">Active</Pill>}</td>
                <td className="r nowrap">
                  <button className="btn small" onClick={() => setEditing(u.id)}>Edit</button>{" "}
                  <button className="btn small" onClick={() => reset(u)}>Reset password</button>{" "}
                  {u.mfa_enabled && u.id !== me.id && <><button className="btn small" title="For a lost phone: they set up Google Authenticator again" onClick={() => resetMfa(u)}>Reset 2FA</button>{" "}</>}
                  {u.id !== me.id && <button className="btn small" onClick={() => toggle(u)}>{u.active ? "Turn off" : "Turn on"}</button>}
                </td>
              </tr>
            )))}</tbody>
          </table></div>
        ))}
      </div>
    </section>
  );
}

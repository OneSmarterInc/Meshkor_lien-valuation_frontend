import { useState } from "react";
import { Link } from "react-router-dom";
import { Admin } from "../../api/endpoints.js";
import { Empty, ErrorBox, Loading, useLoad } from "../../components/States.jsx";
import { Pill } from "../../components/UI.jsx";
import { useToast } from "../../components/Toast.jsx";
import { date, int } from "../../utils/format.js";

function FirmForm({ firm, onDone, onCancel }) {
  const toast = useToast();
  const [name, setName] = useState(firm?.name || "");
  const [email, setEmail] = useState(firm?.contact_email || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const f = firm ? await Admin.updateFirm(firm.id, { name, contact_email: email }) : await Admin.addFirm({ name, contact_email: email });
      toast(firm ? `${f.name} saved.` : `${f.name} added. Now add its users.`);
      onDone(f);
      if (!firm) { setName(""); setEmail(""); }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form className={firm ? "edit-row" : "panel"} onSubmit={save}>
      {!firm && <h2>Add a law firm</h2>}
      <div className="grid2">
        <div className="field"><label className="label" htmlFor={`fn-${firm?.id || "new"}`}>Firm name</label>
          <input id={`fn-${firm?.id || "new"}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Smith & Lee LLP" /></div>
        <div className="field"><label className="label" htmlFor={`fe-${firm?.id || "new"}`}>Email for "report ready" (optional)</label>
          <input id={`fe-${firm?.id || "new"}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="intake@firm.com" /></div>
      </div>
      {error && <div className="callout bad" role="alert">{error}</div>}
      <div className="row end">
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
        <button className="btn primary" type="submit" disabled={!name.trim() || busy}>{busy ? "Saving…" : firm ? "Save" : "Add firm"}</button>
      </div>
    </form>
  );
}

export default function Firms() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useLoad(() => Admin.firms(), []);
  const [editing, setEditing] = useState(null);
  const put = (f) => setData((list) => { const i = list.findIndex((x) => x.id === f.id); return i < 0 ? [...list, f].sort((a, b) => a.name.localeCompare(b.name)) : list.map((x) => (x.id === f.id ? f : x)); });
  const toggle = async (f) => {
    try {
      const n = await Admin.updateFirm(f.id, { active: !f.active });
      put(n);
      toast(n.active ? `${n.name} is on again.` : `${n.name} is turned off. Its users cannot sign in; its cases are kept.`);
    } catch (err) { toast(err.message, "error"); }
  };
  return (
    <section className="view">
      <div className="head"><div><h1>Law firms</h1><p>The firms that use the portal. A firm that is turned off keeps its cases, but its users cannot sign in and it is not in the upload list.</p></div></div>
      <FirmForm onDone={put} />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Loading text="Loading firms" />}
      {data && (data.length === 0 ? <Empty title="No law firms yet." /> : (
        <div className="panel"><div className="tbl-wrap"><table>
          <thead><tr><th>Firm</th><th>Report email</th><th className="r">Users</th><th className="r">Cases (open)</th><th>Added</th><th>Status</th><th /></tr></thead>
          <tbody>{data.map((f) => (editing === f.id ? (
            <tr key={f.id}><td colSpan="7"><FirmForm firm={f} onDone={(n) => { put(n); setEditing(null); }} onCancel={() => setEditing(null)} /></td></tr>
          ) : (
            <tr key={f.id}>
              <td><strong>{f.name}</strong></td>
              <td>{f.contact_email || <span className="note">–</span>}</td>
              <td className="r num"><Link to={`/admin/users?firm=${f.id}`}>{int(f.users)}</Link></td>
              <td className="r num">{int(f.cases)} ({int(f.open_cases)})</td>
              <td className="mono">{date(f.created_at)}</td>
              <td>{f.active ? <Pill tone="p-good">Active</Pill> : <Pill tone="p-mute">Turned off</Pill>}</td>
              <td className="r nowrap">
                <button className="btn small" onClick={() => setEditing(f.id)}>Edit</button>{" "}
                <button className="btn small" onClick={() => toggle(f)}>{f.active ? "Turn off" : "Turn on"}</button>
              </td>
            </tr>
          )))}</tbody>
        </table></div></div>
      ))}
    </section>
  );
}

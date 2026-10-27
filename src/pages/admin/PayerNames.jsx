import { useState } from "react";
import { Admin } from "../../api/endpoints.js";
import { Empty, ErrorBox, Loading, useLoad } from "../../components/States.jsx";
import { Pill } from "../../components/UI.jsx";
import { useToast } from "../../components/Toast.jsx";
import { date, int } from "../../utils/format.js";

// An insurer name the payer list does not know gives no insurer rate (the case gets a flag).
// Here an admin says which payer group the name belongs to, then prices the open cases again.
function AddName({ groups, initial = "", onDone, compact }) {
  const toast = useToast();
  const [name, setName] = useState(initial);
  const [group, setGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await Admin.addPayerName(name, group);
      toast(`${r.name} → ${r.group} saved.`);
      onDone(r);
      if (!compact) { setName(""); setGroup(""); }
    } catch (err) { toast(err.message, "error"); } finally { setBusy(false); }
  };
  return (
    <form className="row wrap-ok" onSubmit={save}>
      {!compact && <input aria-label="Insurer name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name as the bill prints it" />}
      <select aria-label="Payer group" value={group} onChange={(e) => setGroup(e.target.value)}>
        <option value="">Payer group…</option>{groups.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <button className="btn small primary" type="submit" disabled={!name.trim() || !group || busy}>{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}

export default function PayerNames() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => Admin.payerNames(), []);
  const [pending, setPending] = useState({});        // name -> open cases to price again
  const [busy, setBusy] = useState(null);
  const saved = (r) => { if (r.open_cases) setPending((p) => ({ ...p, [r.name]: r.open_cases })); reload(); };
  const reprice = async (name) => {
    setBusy(name);
    try {
      const r = await Admin.repricePayerName(name);
      toast(`${r.repriced.length} case(s) priced again.`);
      setPending((p) => { const n = { ...p }; delete n[name]; return n; });
      reload();
    } catch (err) { toast(err.message, "error"); } finally { setBusy(null); }
  };
  const remove = async (n) => {
    try { await Admin.deletePayerName(n.id); toast(`${n.name} removed.`); reload(); } catch (err) { toast(err.message, "error"); }
  };

  return (
    <section className="view">
      <div className="head"><div><h1>Payer names</h1>
        <p>Bills print insurer names in many ways. When the payer list does not know a name, the case has no insurer rate and gets a flag. Say which payer group the name belongs to, then price its open cases again. Sent reports are never changed.</p></div></div>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Loading text="Loading payer names" />}
      {data && (
        <>
          {Object.keys(pending).length > 0 && (
            <div className="callout info">
              {Object.entries(pending).map(([name, n]) => (
                <div className="row between" key={name}><span><strong>{name}</strong>: {typeof n === "number" ? `${n} open case(s) still use the old pricing.` : "price its open cases with the new payer group."}</span>
                  <button className="btn small primary" disabled={busy === name} onClick={() => reprice(name)}>{busy === name ? "Pricing…" : "Price them again"}</button></div>
              ))}
            </div>
          )}
          <div className="panel">
            <div className="row between"><h2>Names the payer list did not know</h2><Pill tone={data.unknown.length ? "p-warn" : "p-good"}>{data.unknown.length ? `${data.unknown.length} to sort` : "None"}</Pill></div>
            {data.unknown.length === 0 ? <p className="note">Every insurer name on the cases is known.</p> : (
              <div className="tbl-wrap"><table>
                <thead><tr><th>Name on the bill</th><th className="r">Cases</th><th className="r">Open</th><th>Belongs to</th></tr></thead>
                <tbody>{data.unknown.map((u) => (
                  <tr key={u.payer_name}><td><strong>{u.payer_name}</strong></td><td className="r num">{int(u.cases)}</td><td className="r num">{int(u.open)}</td>
                    <td><AddName compact groups={data.groups} initial={u.payer_name} onDone={saved} /></td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
          <div className="panel">
            <h2>Names added by an admin</h2>
            <AddName groups={data.groups} onDone={saved} />
            <p className="note">A name matches as whole words, in any case: "Acme Benefits" also matches "ACME BENEFITS OF OHIO", not "Acme Benefitsplus". These names are tried before the built-in list (config/payer_groups.yaml).</p>
            {data.names.length === 0 ? <Empty title="No names added yet." /> : (
              <div className="tbl-wrap"><table>
                <thead><tr><th>Name</th><th>Payer group</th><th>Added</th><th>By</th><th /></tr></thead>
                <tbody>{data.names.map((n) => (
                  <tr key={n.id}><td><strong>{n.name}</strong></td><td>{n.group}</td><td className="mono">{date(n.created_at)}</td><td>{n.created_by || "–"}</td>
                    <td className="r nowrap"><button className="btn small" onClick={() => setPending((p) => ({ ...p, [n.name]: true }))}>Price open cases again</button>{" "}
                      <button className="btn small" onClick={() => remove(n)}>Remove</button></td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

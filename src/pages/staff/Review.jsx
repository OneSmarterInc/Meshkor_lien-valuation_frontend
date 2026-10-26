import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Cases } from "../../api/endpoints.js";
import { Empty, ErrorBox, Loading, useLoad } from "../../components/States.jsx";
import { ActionButton, Bars, FileName, Hash, Pill } from "../../components/UI.jsx";
import { date, money, ratio } from "../../utils/format.js";
import CaseHeader from "./CaseHeader.jsx";

const LEVEL = { principal: ["Principal", "p-info"], mcc: ["MCC", "p-bad"], cc: ["CC", "p-warn"], other: ["Other", "p-mute"] };

function HospitalBar({ m }) {
  if (!m) return <div className="callout bad"><strong>Hospital not matched.</strong> The billing NPI was not found, or it has no CCN. Check the bill.</div>;
  const pf = m.price_file;
  return (
    <div className={`callout ${pf?.covers_service_date ? "info" : ""} hospital-bar`}>
      <strong>Hospital found</strong>
      <span>{m.hospital_name} · CCN <span className="mono">{m.ccn}</span> · NPI <span className="mono">{m.npi}</span></span>
      {pf ? (
        <span>price file updated <span className="mono">{date(pf.last_updated_on)}</span> · {pf.covers_service_date ? "in force on the service date" : "does not cover the service date, so rates are estimates"}</span>
      ) : <span>no price file for this hospital</span>}
    </div>
  );
}

function Flags({ c, setCase }) {
  const open = c.flags.filter((f) => f.severity === "check" && !f.resolved).length;
  const resolve = async (f) => {
    const nf = await Cases.resolveFlag(c.id, f.id);
    setCase((x) => ({ ...x, flags: x.flags.map((y) => (y.id === f.id ? { ...y, ...nf, resolved: true } : y)) }));
  };
  return (
    <div className="panel">
      <div className="row between"><h2>Needs a look</h2><Pill tone={open ? "p-warn" : "p-good"}>{open ? `${open} to check` : "All checked"}</Pill></div>
      {c.flags.length === 0 && <p className="note">Nothing flagged on this bill.</p>}
      {c.flags.map((f) => (
        <div className="file-row" key={f.id}>
          <div><strong>{f.title}</strong>{f.detail && <div className="note">{f.detail}</div>}</div>
          {f.severity === "info" ? <Pill tone="p-info">Info</Pill>
            : f.resolved ? <Pill tone="p-good">Checked</Pill>
            : <ActionButton action={() => resolve(f)} okText="Marked as checked">Looks right</ActionButton>}
        </div>
      ))}
    </div>
  );
}

function Totals({ t }) {
  if (!t) return null;
  const rows = [
    { label: "Billed", value: t.billed, display: money(t.billed), muted: true },
    { label: "Insurer rate", value: t.payer_rate, display: money(t.payer_rate) },
    { label: "Median rate", value: t.median, display: money(t.median) },
    { label: "Cash price", value: t.cash, display: t.cash == null ? "not posted" : money(t.cash) },
    { label: "Hospital cost", value: t.cost, display: money(t.cost) },
    { label: "Medicare", value: t.medicare, display: money(t.medicare) },
  ];
  return (
    <div className="panel">
      <h2>Bill total against each benchmark</h2>
      <Bars rows={rows} />
      {t.payer_rate ? (
        <p className="note">
          {t.coverage?.payer_rate_billed != null && t.coverage.payer_rate < 100
            ? `On the ${t.coverage.lines_with?.payer_rate ?? "–"} lines with an insurer rate (${t.coverage.payer_rate} % of billed charges), billed is ${ratio(t.coverage.payer_rate_billed, t.payer_rate)} the hospital's own insurer rate.`
            : `Billed is ${ratio(t.billed, t.payer_rate)} the hospital's own insurer rate.`}
          {t.payer_rate_is_estimate ? " Part of the insurer rate is an estimate." : ""}
        </p>
      ) : null}
    </div>
  );
}

function LineDetail({ l, payer }) {
  if (!l) return null;
  return (
    <div className="panel">
      <h2>Line {l.line_no} · {l.hcpcs || "no code"} · {l.description}</h2>
      <div className="grid4">
        <div><span className="label">{payer} rate</span><div className="num">{money(l.payer_rate)}{l.payer_rate_is_estimate && <span className="note"> est.</span>}</div></div>
        <div><span className="label">Median · 10th–90th</span><div className="num">{money(l.median)}</div><div className="note num">{money(l.p10)} – {money(l.p90)}</div></div>
        <div><span className="label">Medicare</span><div className="num">{l.medicare_status === "packaged" ? "packaged" : money(l.medicare)}</div><div className="note">{l.medicare_source}</div></div>
        <div><span className="label">Hospital cost</span><div className="num">{money(l.cost)}</div></div>
      </div>
      {l.sources?.length > 0 && (
        <div className="tbl-wrap"><table className="sources"><colgroup><col className="c-data" /><col className="c-file" /><col className="c-hash" /></colgroup>
          <thead><tr><th>Source</th><th>File</th><th>SHA-256</th></tr></thead>
          <tbody>{l.sources.map((s, i) => <tr key={i}><td>{s.label}</td><td className="file"><FileName name={s.file_name} /></td><td className="hash"><Hash value={s.sha256} /></td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}

function Lines({ c }) {
  const [basis, setBasis] = useState(c.totals?.basis === "estimate" ? "estimate" : "service_date");
  const [sel, setSel] = useState(null);
  const { data, error, loading, reload } = useLoad(() => Cases.lines(c.id, basis), [c.id, basis]);
  const payer = c.payer_name || "Insurer";
  const cur = data?.find((l) => l.line_no === sel) || data?.[0];
  return (
    <>
      <div className="row between">
        <h2>Bill lines</h2>
        <div className="seg" role="group" aria-label="Rate basis">
          <button type="button" className={basis === "service_date" ? "on" : ""} onClick={() => setBasis("service_date")}>Rate on service date</button>
          <button type="button" className={basis === "estimate" ? "on" : ""} onClick={() => setBasis("estimate")}>Estimate (nearest price file)</button>
        </div>
      </div>
      {basis === "estimate" && <div className="callout">Estimate: no price file covers the service date, so the {payer} rate, median and cash come from the hospital's nearest price file. Medicare and cost are still for the service date. The report labels these values as estimates.</div>}
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Loading text="Pricing lines" />}
      {data && (data.length === 0 ? <Empty title="No lines read from this bill yet." /> : (
        <>
          <div className="tbl-wrap"><table>
            <thead><tr><th>#</th><th>Date</th><th>Rev</th><th>Code</th><th>Description</th><th className="r">Units</th><th className="r">Billed</th><th className="r">{payer}</th><th className="r">Median</th><th className="r">Cash</th><th className="r">Medicare</th><th className="r">Cost</th><th className="r">Billed ÷ rate</th></tr></thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.line_no} className={`click ${cur?.line_no === l.line_no ? "sel" : ""}`} tabIndex={0}
                    onClick={() => setSel(l.line_no)} onKeyDown={(e) => e.key === "Enter" && setSel(l.line_no)}>
                  <td className="mono">{l.line_no}</td>
                  <td className="mono">{date(l.service_date)}</td>
                  <td className="mono">{l.revenue_code}</td>
                  <td className="mono">{l.hcpcs}{l.modifiers ? `-${l.modifiers}` : ""}</td>
                  <td>{l.description}{l.status?.startsWith("unpriced") && <> <Pill tone="p-bad">unpriced</Pill></>}</td>
                  <td className="r num">{l.units}</td>
                  <td className="r num">{money(l.charge)}</td>
                  <td className="r num">{money(l.payer_rate)}{l.payer_rate_is_estimate && <span className="note"> est.</span>}</td>
                  <td className="r num">{money(l.median)}</td>
                  <td className="r num">{l.cash == null ? <span className="note">n/p</span> : money(l.cash)}</td>
                  <td className="r num">{l.medicare_status === "packaged" ? <span className="note">pkg</span> : money(l.medicare)}</td>
                  <td className="r num">{money(l.cost)}</td>
                  <td className="r num">{ratio(l.charge, l.payer_rate)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td colSpan="6">Total ({data.length} lines)</td>
              <td className="r num">{money(sum(data, "charge"))}</td>
              <td className="r num">{money(sum(data, "payer_rate"))}</td>
              <td className="r num">{money(sum(data, "median"))}</td>
              <td className="r num">–</td>
              <td className="r num">{money(sum(data, "medicare"))}</td>
              <td className="r num">{money(sum(data, "cost"))}</td>
              <td className="r num">{ratio(sum(data.filter((l) => l.payer_rate != null), "charge"), sum(data, "payer_rate"))}</td>
            </tr></tfoot>
          </table></div>
          <p className="note">Click a line to see its sources. n/p = not posted by the hospital · pkg = packaged into another Medicare payment.</p>
          <LineDetail l={cur} payer={payer} />
        </>
      ))}
    </>
  );
}
const sum = (rows, k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);

function Stay({ c, setCase }) {
  const s = c.stay;
  const v = s.values || {};
  return (
    <div className="grid2">
      <div className="panel">
        <div className="row between"><h2>DRG {s.ms_drg}</h2><Pill tone={s.drg_confirmed ? "p-good" : "p-warn"}>{s.drg_confirmed ? "Confirmed" : "To confirm"}</Pill></div>
        <p>{s.drg_title}</p>
        <p className="note">From the {s.drg_source === "grouper" ? "CMS grouper (the bill showed no DRG)" : s.drg_source === "reviewer" ? "reviewer (changed from the bill)" : "bill"} · {s.los_days} day{s.los_days === 1 ? "" : "s"}</p>
        {s.diagnoses?.length > 0 && (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Diagnosis</th><th>Meaning</th><th>Level</th></tr></thead>
            <tbody>{s.diagnoses.map((d) => { const [t, tone] = LEVEL[d.level] || LEVEL.other; return <tr key={d.code}><td className="mono">{d.code}</td><td>{d.description}</td><td><Pill tone={tone}>{t}</Pill></td></tr>; })}</tbody>
          </table></div>
        )}
        {!s.drg_confirmed && (
          <div className="row"><ActionButton className="btn primary" okText={`DRG ${s.ms_drg} confirmed`}
            action={async () => { const ns = await Cases.confirmDrg(c.id, s.ms_drg); setCase((x) => ({ ...x, stay: { ...x.stay, ...ns, drg_confirmed: true } })); }}>
            Confirm DRG {s.ms_drg}</ActionButton></div>
        )}
      </div>
      <div className="panel">
        <h2>Stay value</h2>
        <div className="tbl-wrap"><table><tbody>
          <tr><td>Billed</td><td className="r num">{money(v.billed)}</td></tr>
          <tr><td>Hospital DRG rate, {c.payer_name || "insurer"}</td><td className="r num">{money(v.payer_rate)}</td></tr>
          <tr><td>Hospital DRG median</td><td className="r num">{money(v.median)}</td></tr>
          <tr><td>Medicare (DRG weight × wage-adjusted base rate)</td><td className="r num">{money(v.medicare)}</td></tr>
          <tr><td>Hospital cost</td><td className="r num">{money(v.cost)}</td></tr>
        </tbody></table></div>
        <p className="note">A hospital stay is priced as 1 DRG, not line by line.</p>
      </div>
    </div>
  );
}

export default function Review() {
  const { id } = useParams();
  const { data: c, error, loading, reload, setData } = useLoad(() => Cases.get(id), [id]);
  if (loading && !c) return <Loading text="Loading the case" />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const processing = ["uploaded", "processing"].includes(c.status);

  return (
    <section className="view">
      <CaseHeader c={c} step="review" intro="The system has read the bill, found the hospital and priced every line. Check the flagged items, then build the report." />
      {processing ? (
        <div className="panel"><h2>Still processing</h2><p>The bill is being read and priced. This page fills in when it is done.</p>
          <div className="row"><button className="btn" onClick={reload}>Check again</button></div></div>
      ) : (
        <>
          <HospitalBar m={c.hospital_match} />
          <div className="grid2">
            <Flags c={c} setCase={setData} />
            {c.setting === "inpatient" ? <Totals t={c.stay?.values ? { ...c.stay.values, cash: c.totals?.cash } : c.totals} /> : <Totals t={c.totals} />}
          </div>
          {c.setting === "inpatient" && c.stay && <Stay c={c} setCase={setData} />}
          <Lines c={c} />
          <div className="row end">
            <Link className="btn" to="/cases">Back to cases</Link>
            <Link className="btn primary" to={`/cases/${c.id}/report`}>Build the report</Link>
          </div>
        </>
      )}
    </section>
  );
}

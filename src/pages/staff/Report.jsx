import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Cases } from "../../api/endpoints.js";
import { ErrorBox, Loading, useLoad } from "../../components/States.jsx";
import { ActionButton, FileName, Hash } from "../../components/UI.jsx";
import { date, dateTime, money, range } from "../../utils/format.js";
import CaseHeader from "./CaseHeader.jsx";

function ReportDoc({ c, r }) {
  const payer = c.payer_name || "insurer";
  const hasEob = (r.lines || []).some((l) => l.eob_allowed != null);
  return (
    <article className="doc">
      <div>
        <span className="label ui">MeshKor · Bill valuation report · {c.status === "sent" ? "final" : "draft"} · built {dateTime(r.generated_at)}</span>
        <h2>{r.title || "Reasonable value of hospital charges"}, {c.case_number}</h2>
      </div>
      <div className="meta">
        <div><span className="label">Hospital</span><br />{c.hospital_name} (CCN {c.ccn})</div>
        <div><span className="label">Service date</span><br />{range(c.service_date_from, c.service_date_to)} · {c.setting}</div>
        <div><span className="label">Insurer on file</span><br />{c.payer_name || "None"}</div>
        <div><span className="label">Prepared for</span><br />{c.firm?.name} · {c.matter_ref}</div>
      </div>

      <h3>1. Summary</h3>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Benchmark</th><th className="r">Total</th><th className="r">% of billed</th></tr></thead>
        <tbody>{(r.summary || []).map((s) => <tr key={s.key || s.benchmark}><td>{s.benchmark}{s.note && <div className="note">{s.note}</div>}</td><td className="r num">{money(s.total)}</td><td className="r num">{s.pct_of_billed == null ? "–" : `${Math.round(s.pct_of_billed)}%`}</td></tr>)}</tbody>
      </table></div>
      {r.summary_text && <p>{r.summary_text}</p>}
      {r.stay?.ms_drg && (
        <p><b>Inpatient stay.</b> Valued as one MS-DRG: {r.stay.ms_drg} {r.stay.drg_title}{r.stay.los_days != null ? `, ${r.stay.los_days} days` : ""}.
          {" "}DRG {r.stay.drg_confirmed ? "confirmed by the reviewer" : "as shown on the bill, not yet confirmed"}.
          {r.stay.medicare_source ? ` Medicare: ${r.stay.medicare_source}.` : ""}
          {r.stay.p10 != null ? ` Posted rates for this DRG range from ${money(r.stay.p10)} (10th percentile) to ${money(r.stay.p90)} (90th).` : ""}</p>
      )}

      {r.eob && (
        <p><b>Insurer's EOB.</b> {r.eob.payer || "The insurer"}{r.eob.claim_number ? `, claim ${r.eob.claim_number}` : ""}:
          {" "}allowed {money(r.eob.totals?.allowed)}, paid {money(r.eob.totals?.paid)}{r.eob.totals?.patient != null ? `, patient share ${money(r.eob.totals.patient)}` : ""}.
          {" "}{r.eob.level === "stay" ? `The EOB shows the stay as one line${r.eob.ms_drg ? ` (MS-DRG ${r.eob.ms_drg})` : ""}.` : `${r.eob.lines_matched} of ${r.eob.bill_lines} bill lines matched to the EOB.`}</p>
      )}

      <h3>2. Line by line</h3>
      <div className="tbl-wrap"><table>
        <thead><tr><th>#</th><th>Code</th><th>Service</th><th className="r">Billed</th>{hasEob && <th className="r">Allowed (EOB)</th>}<th className="r">{payer}</th><th className="r">Medicare</th><th className="r">Cost</th></tr></thead>
        <tbody>{(r.lines || []).map((l) => (
          <tr key={l.line_no}><td className="mono">{l.line_no}</td><td className="mono">{l.hcpcs}</td><td>{l.description}</td>
            <td className="r num">{money(l.charge)}</td>
            {hasEob && <td className="r num">{money(l.eob_allowed)}</td>}
            <td className="r num">{money(l.payer_rate)}{l.payer_rate_is_estimate ? " (est.)" : ""}</td>
            <td className="r num">{l.medicare_status === "packaged" && !l.medicare ? "packaged" : money(l.medicare)}</td>
            <td className="r num">{money(l.cost)}</td></tr>
        ))}</tbody>
      </table></div>

      <h3>3. Sources</h3>
      <div className="tbl-wrap"><table className="sources"><colgroup><col className="c-data" /><col className="c-file" /><col className="c-dated" /><col className="c-hash" /></colgroup>
        <thead><tr><th>Data</th><th>File</th><th>Dated</th><th>SHA-256</th></tr></thead>
        <tbody>{(r.sources || []).map((s, i) => <tr key={i}><td>{s.data}</td><td className="file"><FileName name={s.file_name} /></td><td className="mono dated">{date(s.dated)}</td><td className="hash"><Hash value={s.sha256} /></td></tr>)}</tbody>
      </table></div>

      {r.method && <><h3>4. Method</h3><p>{r.method}</p></>}
      {r.limits && <><h3>5. Limits</h3><p>{r.limits}</p></>}
      {r.reviewer?.approved_at && <p className="note ui">Approved by {r.reviewer.name} on {dateTime(r.reviewer.approved_at)}.</p>}
    </article>
  );
}

// A sent report is frozen on the server: every download gives these exact files (same SHA-256).
function Released({ r }) {
  return (
    <div className="panel">
      <div className="row between"><h2>Released report</h2><span className="note">released {dateTime(r.released_at)}</span></div>
      <p className="note">This is the report exactly as it was sent. It does not change when the price files, the CMS tables or the portal change. Every download gives the same files.{r.note ? ` (${r.note}.)` : ""}</p>
      <div className="tbl-wrap"><table className="sources"><colgroup><col className="c-data" /><col className="c-hash" /></colgroup>
        <thead><tr><th>File</th><th>SHA-256 fingerprint</th></tr></thead>
        <tbody>
          <tr><td>PDF report</td><td className="hash"><Hash value={r.pdf_sha256} /></td></tr>
          <tr><td>CSV data appendix</td><td className="hash"><Hash value={r.csv_sha256} /></td></tr>
        </tbody>
      </table></div>
      <p className="note">To check a copy on Windows: <span className="mono">Get-FileHash MK-…_valuation_report.pdf</span> must show the same fingerprint.</p>
    </div>
  );
}

export default function Report() {
  const { id } = useParams();
  const kase = useLoad(() => Cases.get(id), [id]);
  const rep = useLoad(() => Cases.report(id), [id]);
  const [note, setNote] = useState("");
  const c = kase.data;

  if (kase.loading && !c) return <Loading text="Loading the case" />;
  if (kase.error) return <ErrorBox error={kase.error} onRetry={kase.reload} />;
  const open = (c.flags || []).filter((f) => f.severity === "check" && !f.resolved).length;
  const sent = c.status === "sent";

  const downloads = (
    <>
      <ActionButton action={() => Cases.downloadPdf(c)} okText={(n) => `Downloaded ${n}`}>⬇ Download PDF report</ActionButton>
      <ActionButton action={() => Cases.downloadCsv(c)} okText={(n) => `Downloaded ${n}`}>⬇ Download data (CSV)</ActionButton>
    </>
  );

  return (
    <section className="view">
      <CaseHeader c={c} step="report" right={downloads}
        intro={sent ? "This report has been sent to the law firm." : "Read the report once, then approve. Approving sends it to the law firm and records it in the audit log."} />

      {!sent && (
        <>
          {open > 0 && <div className="callout">{open} flagged {open > 1 ? "items are" : "item is"} not checked yet. <Link to={`/cases/${c.id}/review`}>Go back to Review</Link>, or approve anyway.</div>}
          <div className="panel">
            <div className="row between">
              <div><strong>Send to {c.firm?.name}</strong><div className="note">Matter {c.matter_ref} · PDF report + CSV data · the firm gets an email and downloads it from "My reports"</div></div>
            </div>
            <div className="field"><label className="label" htmlFor="note">Note (required to send back)</label>
              <textarea id="note" rows="2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for the audit log, or the reason for sending it back" /></div>
            <div className="row end">
              <ActionButton disabled={!note.trim()} okText="Sent back to review"
                action={async () => { const x = await Cases.sendBack(c.id, note.trim()); kase.setData((o) => ({ ...o, ...x })); }}>Send back</ActionButton>
              <ActionButton className="btn primary" okText={`Approved and sent to ${c.firm?.name}`}
                action={async () => { await Cases.approve(c.id, note.trim() || undefined); kase.reload(); rep.reload(); }}>Approve and send</ActionButton>
            </div>
          </div>
        </>
      )}

      {sent && (rep.data?.released || c.released) && <Released r={rep.data?.released || c.released} />}
      <ErrorBox error={rep.error} onRetry={rep.reload} />
      {rep.loading && !rep.data && <Loading text="Building the report" />}
      {rep.data && <ReportDoc c={c} r={rep.data} />}
    </section>
  );
}

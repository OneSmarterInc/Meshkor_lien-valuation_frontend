import { useState } from "react";
import { Link } from "react-router-dom";
import { Cases } from "../../api/endpoints.js";
import { BUSY, Empty, ErrorBox, Loading, useLoad, usePoll } from "../../components/States.jsx";
import { ActionButton, Pill } from "../../components/UI.jsx";
import { useToast } from "../../components/Toast.jsx";
import { money, range, statusFirm } from "../../utils/format.js";

function Feedback({ cases }) {
  const toast = useToast();
  const sent = cases.filter((c) => c.status === "sent");
  const [caseId, setCaseId] = useState("");
  const [outcome, setOutcome] = useState("");
  const [price, setPrice] = useState("");
  const [model, setModel] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  if (!sent.length) return null;
  const ok = caseId && outcome;
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await Cases.feedback(caseId, {
        outcome, pricing_model: model || null, comment,
        price_per_report: price === "" ? null : Number(price),
      });
      toast("Thank you. Your feedback is saved.");
      setCaseId(""); setOutcome(""); setPrice(""); setModel(""); setComment("");
    } catch (err) { toast(err.message, "error"); } finally { setBusy(false); }
  };
  return (
    <form className="panel" onSubmit={send}>
      <h2>Tell us how a report worked</h2>
      <p className="note">Did it change the outcome of the negotiation? It takes 1 minute.</p>
      <div className="grid4">
        <div className="field"><label className="label" htmlFor="fb-case">Report</label>
          <select id="fb-case" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            <option value="">Choose</option>
            {sent.map((c) => <option key={c.id} value={c.id}>{c.case_number} · {c.matter_ref}</option>)}
          </select></div>
        <div className="field"><label className="label" htmlFor="fb-out">Outcome</label>
          <select id="fb-out" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="">Choose</option><option value="reduced">Lien reduced</option>
            <option value="partly">Partly helped</option><option value="no_change">No change</option>
          </select></div>
        <div className="field"><label className="label" htmlFor="fb-price">Fair price per report ($)</label>
          <input id="fb-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} /></div>
        <div className="field"><label className="label" htmlFor="fb-model">Pay per report or monthly?</label>
          <select id="fb-model" value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="">Choose</option><option value="per_report">Per report</option><option value="subscription">Monthly subscription</option>
          </select></div>
      </div>
      <div className="field"><label className="label" htmlFor="fb-c">Comment</label>
        <textarea id="fb-c" rows="2" value={comment} onChange={(e) => setComment(e.target.value)} /></div>
      <div className="row end"><button className="btn primary" type="submit" disabled={!ok || busy}>{busy ? "Sending…" : "Send feedback"}</button></div>
    </form>
  );
}

export default function MyReports() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { data, error, loading, reload, refresh } = useLoad(() => Cases.list({ page, search: q }), [page, q]);
  usePoll(!!data?.results?.some((c) => BUSY.includes(c.status)), refresh, 5000);   // the status updates by itself

  return (
    <section className="view">
      <div className="head">
        <div><h1>My reports</h1><p>Bills your firm uploaded and their reports. You get an email when a report is ready.</p></div>
        <Link className="btn primary" to="/upload">Upload a bill</Link>
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(search); }}>
        <div className="field grow"><label className="label" htmlFor="q">Search</label>
          <input id="q" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Matter reference, case number or hospital" /></div>
        <button className="btn" type="submit">Search</button>
      </form>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Loading text="Loading your reports" />}
      {data && (data.results.length === 0 ? (
        <Empty title={q ? "No reports match your search." : "No bills yet."}>{q ? "Try another word." : "Upload your first bill to get a report."}</Empty>
      ) : (
        <>
          <div className="tbl-wrap"><table>
            <thead><tr><th>Case</th><th>Matter</th><th>Hospital</th><th>Service date</th><th className="r">Billed</th><th>Status</th><th>Report</th></tr></thead>
            <tbody>
              {data.results.map((c) => {
                const [label, tone] = statusFirm(c.status);
                return (
                  <tr key={c.id}>
                    <td className="mono">{c.case_number}</td>
                    <td>{c.matter_ref}</td>
                    <td>{c.hospital_name || <span className="note">Being identified</span>}</td>
                    <td className="mono">{range(c.service_date_from, c.service_date_to)}</td>
                    <td className="r num">{money(c.billed_total)}</td>
                    <td><Pill tone={tone}>{label}</Pill></td>
                    <td>{c.status === "sent" ? (
                      <div className="row nowrap">
                        <ActionButton action={() => Cases.downloadPdf(c)} okText={(n) => `Downloaded ${n}`}>⬇ PDF</ActionButton>
                        <ActionButton action={() => Cases.downloadCsv(c)} okText={(n) => `Downloaded ${n}`}>⬇ CSV</ActionButton>
                      </div>
                    ) : <span className="note">{c.status === "error" ? "MeshKor is looking at this bill and will contact you if anything is needed" : "Usually within 1 business day"}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          <Pager data={data} page={page} setPage={setPage} />
          <Feedback cases={data.results} />
        </>
      ))}
    </section>
  );
}

export function Pager({ data, page, setPage }) {
  if (!data || (!data.next && !data.previous)) return null;
  return (
    <div className="row end">
      <span className="note">{data.count} in total</span>
      <button className="btn" disabled={!data.previous} onClick={() => setPage(page - 1)}>Previous</button>
      <button className="btn" disabled={!data.next} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
}

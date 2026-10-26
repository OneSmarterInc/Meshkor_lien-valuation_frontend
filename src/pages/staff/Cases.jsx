import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cases as API } from "../../api/endpoints.js";
import { BUSY, Empty, ErrorBox, Loading, useLoad, usePoll } from "../../components/States.jsx";
import { Pill, Stat } from "../../components/UI.jsx";
import { int, money, range, statusStaff } from "../../utils/format.js";
import { Pager } from "../firm/MyReports.jsx";

const FILTERS = [
  ["", "All"], ["needs_review", "Needs review"], ["uploaded,processing", "Processing"],
  ["returned,no_price_file,error", "Problems"], ["sent", "Sent"],
];

export default function Cases() {
  const nav = useNavigate();
  const [status, setStatus] = useState("needs_review");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const stats = useLoad(() => API.stats(), []);
  const list = useLoad(() => API.list({ status, page, search: q }), [status, page, q]);
  const s = stats.data;
  usePoll(!!list.data?.results?.some((c) => BUSY.includes(c.status)) || !!s?.processing, () => { list.refresh(); stats.refresh(); }, 5000);

  return (
    <section className="view">
      <div className="head"><div>
        <h1>Cases</h1>
        <p>Every bill uploaded by a law firm. The system reads, matches and prices each bill; you review the flagged items and send the report.</p>
      </div></div>

      <ErrorBox error={stats.error} onRetry={stats.reload} />
      {s && (
        <div className="grid4">
          <Stat label="Needs your review" value={int(s.needs_review)} />
          <Stat label="Processing" value={int(s.processing)} />
          <Stat label="Sent this month" value={int(s.sent_this_month)} />
          <Stat label="Billed, open cases" value={money(s.billed_open_total)} />
        </div>
      )}

      <div className="row">
        <div className="seg" role="group" aria-label="Filter by status">
          {FILTERS.map(([v, t]) => (
            <button key={t} type="button" className={status === v ? "on" : ""} onClick={() => { setStatus(v); setPage(1); }}>{t}</button>
          ))}
        </div>
        <form className="row grow" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(search); }}>
          <input aria-label="Search" className="input grow" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Case, matter, hospital or insurer" />
          <button className="btn" type="submit">Search</button>
        </form>
      </div>

      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.data && <Loading text="Loading cases" />}
      {list.data && (list.data.results.length === 0 ? (
        <Empty title="No cases here.">Choose another filter or search term.</Empty>
      ) : (
        <>
          <div className="tbl-wrap"><table>
            <thead><tr><th>Case</th><th>Firm</th><th>Visit</th><th>Hospital</th><th>Service date</th><th className="r">Billed</th><th>Status</th></tr></thead>
            <tbody>
              {list.data.results.map((c) => {
                const [label, tone] = statusStaff(c.status);
                const go = () => nav(`/cases/${c.id}/${c.status === "sent" ? "report" : "review"}`);
                return (
                  <tr key={c.id} className="click" tabIndex={0} onClick={go} onKeyDown={(e) => e.key === "Enter" && go()}>
                    <td className="mono">{c.case_number}</td>
                    <td>{c.firm?.name}<div className="note">{c.matter_ref}</div></td>
                    <td>{c.visit_summary || <span className="note">–</span>}</td>
                    <td>{c.hospital_name || <span className="note">Not matched yet</span>}</td>
                    <td className="mono">{range(c.service_date_from, c.service_date_to)}</td>
                    <td className="r num">{money(c.billed_total)}</td>
                    <td><Pill tone={tone}>{label}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          <Pager data={list.data} page={page} setPage={setPage} />
        </>
      ))}
    </section>
  );
}

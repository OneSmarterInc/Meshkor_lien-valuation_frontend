import { useState } from "react";
import { Audit } from "../../api/endpoints.js";
import { Empty, ErrorBox, Loading, useLoad } from "../../components/States.jsx";
import { dateTime } from "../../utils/format.js";
import { Pager } from "../firm/MyReports.jsx";

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(() => Audit.list({ page }), [page]);
  return (
    <section className="view">
      <div className="head"><div><h1>Audit log</h1><p>Every upload, view, approval and download is recorded with who and when.</p></div>
        <button className="btn" onClick={reload}>Refresh</button></div>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Loading text="Loading the audit log" />}
      {data && (data.results.length === 0 ? <Empty title="No events yet." /> : (
        <>
          <div className="panel"><div className="timeline">
            {data.results.map((e, i) => (
              <div className="tl" key={i}>
                <span className="mono note">{dateTime(e.at)}</span>
                <span className="dot" aria-hidden="true" />
                <div className="bodyx"><strong>{e.action}</strong>{e.case_number && <span className="mono note"> · {e.case_number}</span>}
                  <div className="note">{e.actor}{e.detail ? ` · ${e.detail}` : ""}</div></div>
              </div>
            ))}
          </div></div>
          <Pager data={data} page={page} setPage={setPage} />
        </>
      ))}
    </section>
  );
}

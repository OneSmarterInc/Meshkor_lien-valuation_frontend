import { DataSources as API } from "../../api/endpoints.js";
import { Empty, ErrorBox, Loading, useLoad } from "../../components/States.jsx";
import { Pill } from "../../components/UI.jsx";
import { date, dateTime, int } from "../../utils/format.js";

const REF = { ok: ["OK", "p-good"], partial: ["Partial", "p-warn"], missing: ["Missing", "p-bad"] };
const MRF = { loaded: ["Loaded", "p-good"], downloading: ["Downloading", "p-warn"], not_found: ["Not found", "p-bad"], error: ["Error", "p-bad"] };

export default function DataSources() {
  const { data: d, error, loading, reload } = useLoad(() => API.get(), []);
  return (
    <section className="view">
      <div className="head">
        <div><h1>Data sources</h1><p>Every benchmark comes from an official public file, kept as downloaded with its hash. Checks run after each load.</p></div>
        {d?.verify && <Pill tone={d.verify.fail ? "p-bad" : "p-good"}>{int(d.verify.pass)} pass · {int(d.verify.fail)} fail · {dateTime(d.verify.run_at)}</Pill>}
      </div>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !d && <Loading text="Loading data sources" />}
      {d && (
        <div className="grid2">
          <div className="panel"><h2>Medicare and reference tables</h2>
            {d.reference?.length ? (
              <div className="tbl-wrap"><table>
                <thead><tr><th>Data</th><th className="r">Rows</th><th>Covers</th><th>Status</th></tr></thead>
                <tbody>{d.reference.map((r) => { const [t, tone] = REF[r.status] || REF.missing; return <tr key={r.name}><td>{r.name}</td><td className="r num">{int(r.rows)}</td><td className="mono">{r.covers}</td><td><Pill tone={tone}>{t}</Pill></td></tr>; })}</tbody>
              </table></div>
            ) : <Empty title="No reference tables reported." />}
          </div>
          <div className="panel"><h2>Hospital price files</h2>
            {d.price_files?.length ? (
              <div className="tbl-wrap"><table>
                <thead><tr><th>CCN</th><th>Hospital</th><th>Last updated</th><th className="r">Rows</th><th>Status</th></tr></thead>
                <tbody>{d.price_files.map((r) => { const [t, tone] = MRF[r.status] || MRF.error; return <tr key={r.ccn}><td className="mono">{r.ccn}</td><td>{r.hospital_name}</td><td className="mono">{date(r.last_updated_on)}</td><td className="r num">{int(r.rows)}</td><td><Pill tone={tone}>{t}</Pill></td></tr>; })}</tbody>
              </table></div>
            ) : <Empty title="No hospital price files loaded yet." />}
            <div className="callout info">Price files are downloaded every month. A new version is kept only when the file changes.</div>
          </div>
        </div>
      )}
    </section>
  );
}

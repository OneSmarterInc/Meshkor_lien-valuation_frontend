import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cases, Firms } from "../api/endpoints.js";
import { useLoad } from "../components/States.jsx";
import { isStaff, useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { bytes } from "../utils/format.js";

const OK_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];
const MAX = 50 * 1024 * 1024;

function FilePick({ id, label, hint, file, setFile, required }) {
  const ref = useRef();
  const [over, setOver] = useState(false);
  const [err, setErr] = useState(null);
  const take = (f) => {
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) return setErr("Use a PDF, JPG, PNG or TIFF file.");
    if (f.size > MAX) return setErr("The file is larger than 50 MB.");
    setErr(null); setFile(f);
  };
  return (
    <div className="field">
      <span className="label">{label}{required ? "" : " (optional)"}</span>
      <div
        className={`drop ${over ? "over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
      >
        {file ? (
          <div className="file-row in-drop">
            <div><strong>{file.name}</strong><div className="note">{bytes(file.size)}</div></div>
            <button type="button" className="btn ghost" onClick={() => setFile(null)}>Remove</button>
          </div>
        ) : (
          <>
            <strong>Drop the file here</strong>
            <span className="note">{hint}</span>
            <button type="button" className="btn" onClick={() => ref.current.click()}>Choose file</button>
          </>
        )}
        <input ref={ref} id={id} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff" onChange={(e) => take(e.target.files[0])} />
      </div>
      {err && <span className="field-err">{err}</span>}
    </div>
  );
}

export default function UploadBill() {
  const { user } = useAuth();
  const staff = isStaff(user);
  const nav = useNavigate();
  const toast = useToast();
  const [matter, setMatter] = useState("");
  const [reportFor, setReportFor] = useState("plaintiff");
  const [firmId, setFirmId] = useState("");
  const [consent, setConsent] = useState(false);
  const [bill, setBill] = useState(null);
  const [eob, setEob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const firms = useLoad(() => (staff ? Firms.list() : Promise.resolve([])), [staff]);
  const firmList = Array.isArray(firms.data) ? firms.data : firms.data?.results || [];

  const ready = bill && consent && matter.trim() && (!staff || firmId);

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true); setError(null);
    const f = new FormData();
    f.append("matter_ref", matter.trim());
    f.append("report_for", reportFor);
    f.append("consent", "true");
    f.append("bill", bill);
    if (eob) f.append("eob", eob);
    if (staff) f.append("firm_id", firmId);
    try {
      const c = await Cases.create(f);
      toast(`Bill uploaded as ${c.case_number}. ${staff ? "" : "You get an email when the report is ready."}`);
      nav(staff ? `/cases/${c.id}/review` : "/my-reports");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="view" onSubmit={submit}>
      <div className="head"><div>
        <h1>Upload a bill</h1>
        <p>Upload the itemized hospital bill and, if you have it, the insurer's EOB. Files are encrypted and stored apart from all other data. The original file is never changed.</p>
      </div></div>
      <div className="grid2">
        <div className="panel">
          <h2>Case details</h2>
          {staff && (
            <div className="field">
              <label className="label" htmlFor="firm">Law firm</label>
              <select id="firm" value={firmId} onChange={(e) => setFirmId(e.target.value)}>
                <option value="">{firms.loading ? "Loading firms…" : "Choose the firm"}</option>
                {firmList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {firms.error && <span className="field-err">{firms.error.message}</span>}
            </div>
          )}
          <div className="field">
            <label className="label" htmlFor="matter">Your matter reference</label>
            <input id="matter" value={matter} onChange={(e) => setMatter(e.target.value)} placeholder="The file number you use for this client" />
          </div>
          <div className="field">
            <label className="label" htmlFor="for">Report for</label>
            <select id="for" value={reportFor} onChange={(e) => setReportFor(e.target.value)}>
              <option value="plaintiff">Plaintiff counsel (reduce the lien)</option>
              <option value="defense">Defense counsel</option>
              <option value="lien_resolution">Lien-resolution company</option>
            </select>
          </div>
          <label className="check">
            <input type="checkbox" id="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>The client has consented to sharing this bill for valuation.</span>
          </label>
        </div>
        <div className="panel">
          <h2>Files</h2>
          <FilePick id="bill" label="Itemized bill" hint="UB-04 or itemized statement · PDF or image · up to 50 MB" file={bill} setFile={setBill} required />
          <FilePick id="eob" label="EOB from the insurer" hint="Shows what the insurer actually paid" file={eob} setFile={setEob} />
          {!eob && <div className="callout info">With the EOB, the report can also show what the insurer actually paid for this bill.</div>}
        </div>
      </div>
      {error && <div className="callout bad" role="alert">{error}</div>}
      <div className="row end">
        {!ready && <span className="note">Add the matter reference{staff ? ", the firm" : ""}, the bill and the consent to submit.</span>}
        <button className="btn primary" type="submit" disabled={!ready || busy}>{busy ? "Uploading…" : "Submit bill"}</button>
      </div>
    </form>
  );
}

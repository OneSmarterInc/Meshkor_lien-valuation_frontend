import { NavLink } from "react-router-dom";
import { Pill } from "../../components/UI.jsx";
import { money, range, statusStaff } from "../../utils/format.js";

// Title block + the 3-step tabs shared by Review and Report.
export default function CaseHeader({ c, step, intro, right }) {
  const [label, tone] = statusStaff(c.status);
  return (
    <>
      <div className="head">
        <div>
          <span className="label">{c.case_number} · {c.firm?.name} · {c.matter_ref}</span>
          <h1>{step === "review" ? "Review" : "Report & send"}</h1>
          {intro && <p>{intro}</p>}
        </div>
        <div className="row">{right}<Pill tone={tone}>{label}</Pill></div>
      </div>
      <nav className="steps" aria-label="Case steps">
        <span className="step done"><b>1</b> Upload</span>
        <NavLink className="step" to={`/cases/${c.id}/review`}><b>2</b> Review</NavLink>
        <NavLink className="step" to={`/cases/${c.id}/report`}><b>3</b> Report &amp; send</NavLink>
        <span className="note steps-meta">{c.hospital_name || "Hospital not matched"} · {range(c.service_date_from, c.service_date_to)} · {c.payer_name || "No insurer"} · billed {money(c.billed_total)}</span>
      </nav>
      {c.status_detail && <div className="callout">{c.status_detail}</div>}
    </>
  );
}

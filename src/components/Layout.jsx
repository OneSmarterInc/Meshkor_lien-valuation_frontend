import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { isAdmin, isStaff, useAuth } from "../auth/AuthContext.jsx";

const STAFF_NAV = [
  ["Workspace", [["/cases", "Cases"], ["/upload", "Upload a bill"], ["/data-sources", "Data sources"], ["/audit", "Audit log"]]],
];
const ADMIN_NAV = [
  ["Admin", [["/admin/firms", "Law firms"], ["/admin/users", "Users"], ["/admin/payer-names", "Payer names"]]],
];
const FIRM_NAV = [
  ["Your firm", [["/upload", "Upload a bill"], ["/my-reports", "My reports"]]],
];

const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const groups = user.must_change_password ? [] : isAdmin(user) ? [...STAFF_NAV, ...ADMIN_NAV] : isStaff(user) ? STAFF_NAV : FIRM_NAV;
  const items = groups.flatMap((g) => g[1]);
  const signOut = async () => { await logout(); nav("/login", { replace: true }); };

  return (
    <>
      <header className="top">
        <div className="top-in">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">MK</div>
            <div>MeshKor Lien Valuation<small>Hospital bill benchmarks for injury cases</small></div>
          </div>
          <div className="top-right">
            <span className="who">{user.name}{user.firm ? ` · ${user.firm.name}` : isStaff(user) ? " · MeshKor" : ""}</span>
            <div className="avatar" title={user.email}>{initials(user.name)}</div>
            <button className="btn ghost" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Sections">
        <div className="in">{items.map(([to, t]) => <NavLink key={to} to={to}>{t}</NavLink>)}</div>
      </nav>
      <div className="shell">
        <aside className="rail" aria-label="Navigation">
          {groups.map(([g, list]) => (
            <div className="rail-group" key={g}>
              <span className="label rail-label">{g}</span>
              {list.map(([to, t]) => <NavLink key={to} to={to}>{t}</NavLink>)}
            </div>
          ))}
          <div className="case-card">
            <span className="label">Signed in as</span>
            <strong>{user.name}</strong>
            <span className="note">{user.firm ? user.firm.name : "MeshKor " + user.role}</span>
            {!isStaff(user) && <span className="note">You see only your firm's cases.</span>}
            <Link className="note" to="/password">Change password</Link>
          </div>
        </aside>
        <main><div className="wrap"><Outlet /></div></main>
      </div>
    </>
  );
}

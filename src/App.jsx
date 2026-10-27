import { Navigate, Route, Routes } from "react-router-dom";
import { homeFor, STAFF, useAuth } from "./auth/AuthContext.jsx";
import RequireRole from "./auth/RequireRole.jsx";
import Layout from "./components/Layout.jsx";
import { Loading } from "./components/States.jsx";
import Login from "./pages/Login.jsx";
import UploadBill from "./pages/UploadBill.jsx";
import MyReports from "./pages/firm/MyReports.jsx";
import Cases from "./pages/staff/Cases.jsx";
import Review from "./pages/staff/Review.jsx";
import Report from "./pages/staff/Report.jsx";
import DataSources from "./pages/staff/DataSources.jsx";
import AuditLog from "./pages/staff/AuditLog.jsx";
import NotFound from "./pages/NotFound.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import Firms from "./pages/admin/Firms.jsx";
import Users from "./pages/admin/Users.jsx";
import PayerNames from "./pages/admin/PayerNames.jsx";

function Home() {
  const { user, checking } = useAuth();
  if (checking) return <Loading text="Checking your session" />;
  return <Navigate to={user ? homeFor(user) : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
      <Route element={<RequireRole><Layout /></RequireRole>}>
        <Route path="/upload" element={<UploadBill />} />
        <Route path="/my-reports" element={<RequireRole roles={["firm"]}><MyReports /></RequireRole>} />
        <Route path="/cases" element={<RequireRole roles={STAFF}><Cases /></RequireRole>} />
        <Route path="/cases/:id" element={<Navigate to="review" replace />} />
        <Route path="/cases/:id/review" element={<RequireRole roles={STAFF}><Review /></RequireRole>} />
        <Route path="/cases/:id/report" element={<RequireRole roles={STAFF}><Report /></RequireRole>} />
        <Route path="/data-sources" element={<RequireRole roles={STAFF}><DataSources /></RequireRole>} />
        <Route path="/audit" element={<RequireRole roles={STAFF}><AuditLog /></RequireRole>} />
        <Route path="/password" element={<ChangePassword />} />
        <Route path="/admin/firms" element={<RequireRole roles={["admin"]}><Firms /></RequireRole>} />
        <Route path="/admin/users" element={<RequireRole roles={["admin"]}><Users /></RequireRole>} />
        <Route path="/admin/payer-names" element={<RequireRole roles={["admin"]}><PayerNames /></RequireRole>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

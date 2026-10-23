import { Navigate, useLocation } from "react-router-dom";
import { homeFor, useAuth } from "./AuthContext.jsx";
import { Loading } from "../components/States.jsx";

// Guards a route: signed in, and (if `roles` given) one of those roles.
export default function RequireRole({ roles, children }) {
  const { user, checking } = useAuth();
  const loc = useLocation();
  if (checking) return <Loading text="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return children;
}

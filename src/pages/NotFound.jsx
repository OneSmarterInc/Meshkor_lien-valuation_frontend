import { Link } from "react-router-dom";
import { homeFor, useAuth } from "../auth/AuthContext.jsx";

export default function NotFound() {
  const { user } = useAuth();
  return (
    <section className="view">
      <h1>Page not found</h1>
      <p>This address does not exist, or you do not have access to it.</p>
      <div className="row"><Link className="btn primary" to={homeFor(user)}>Go to your start page</Link></div>
    </section>
  );
}

import { Navigate, useLocation, useParams } from "react-router-dom";

/**
 * Backwards-compatible redirect for legacy shared links.
 * Old: /webresult/:page/:wbr
 * New: /wr/:page/:wbr
 */
export default function LegacyWebResultRedirect() {
  const { page, wbr } = useParams();
  const location = useLocation();

  if (!page || !wbr) return <Navigate to="/" replace />;

  return <Navigate to={`/wr/${page}/${wbr}${location.search}`} replace />;
}

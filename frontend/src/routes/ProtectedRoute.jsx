import { Navigate } from "react-router";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } =
    useSelector((state) => state.auth);

  const storedUser =
    localStorage.getItem("userInfo");

  if (!isAuthenticated && !storedUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
import { Navigate } from "react-router";
import { useSelector } from "react-redux";

const ModuleProtectedRoute = ({
  children,
  moduleName,
}) => {
  const authState =
    useSelector((state) => state.auth);

  let user = authState.user;

  if (!user) {
    const stored =
      localStorage.getItem("userInfo");

    if (stored) {
      user =
        JSON.parse(stored)?.user;
    }
  }

  const allowedModules =
    user?.role?.allowedModules || {};

  if (!allowedModules[moduleName]) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ModuleProtectedRoute;
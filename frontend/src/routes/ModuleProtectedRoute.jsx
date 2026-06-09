import { Navigate } from "react-router";

import { useSelector } from "react-redux";

const ModuleProtectedRoute = ({
  children,
  moduleName,
}) => {

  const { user } = useSelector(
    (state) => state.auth
  );

  const allowedModules =
    user?.role?.allowedModules || {};

  if (!allowedModules[moduleName]) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ModuleProtectedRoute;
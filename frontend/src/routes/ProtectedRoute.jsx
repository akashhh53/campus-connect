import { useEffect, useState } from "react";

import { Navigate } from "react-router";

import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTimeout(
      () => {
        setReady(true);
      },

      300,
    );
  }, []);

  const stored = localStorage.getItem("userInfo");

  if (!ready) {
    return null;
  }

  if (!isAuthenticated && !stored) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

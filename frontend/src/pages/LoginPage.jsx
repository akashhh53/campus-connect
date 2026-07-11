import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router";
import { FiLock, FiLogIn, FiMail } from "react-icons/fi";

import AuthThemeToggle from "../components/AuthThemeToggle";
import { setCredentials } from "../features/auth/authSlice";
import { loginUser } from "../services/authService";

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setVerificationEmail("");

      const data = await loginUser(formData);

      dispatch(setCredentials(data));
      navigate("/dashboard/feed");
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Login failed";
      setError(errorMessage);

      if (
        err.response?.data?.requiresVerification ||
        errorMessage.toLowerCase().includes("verify your email")
      ) {
        setVerificationEmail(formData.email);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <AuthThemeToggle />
      <section className="auth-hero">
        <div className="cc-eyebrow">Campus Connect</div>
        <h1>Your campus, organized in one place.</h1>
        <p>
          Sign in to reach your feed, chats, lost-found reports, and every
          module your role can access.
        </p>

        <div className="auth-feature-grid">
          <div className="auth-feature">
            <strong>Live feed</strong>
            <span>Post updates, react, comment, and follow classmates.</span>
          </div>
          <div className="auth-feature">
            <strong>Messaging</strong>
            <span>Continue one-to-one conversations with unread badges.</span>
          </div>
          <div className="auth-feature">
            <strong>Lost and found</strong>
            <span>Report, claim, and resolve campus items quickly.</span>
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <form className="auth-panel" onSubmit={handleSubmit}>
          <h2>Welcome back</h2>
          <p>Use your campus account to continue.</p>

          {error && <div className="cc-alert cc-alert-error">{error}</div>}

          <div className="cc-form-grid" style={{ marginTop: 16 }}>
            <label className="cc-field cc-field-full">
              <span className="cc-label">Email</span>
              <span style={{ position: "relative" }}>
                <FiMail
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 13,
                    color: "var(--cc-muted)",
                  }}
                />
                <input
                  autoComplete="email"
                  className="cc-input"
                  name="email"
                  onChange={handleChange}
                  placeholder="you@college.edu"
                  required
                  style={{ paddingLeft: 40 }}
                  type="email"
                  value={formData.email}
                />
              </span>
            </label>

            <label className="cc-field cc-field-full">
              <span className="cc-label">Password</span>
              <span style={{ position: "relative" }}>
                <FiLock
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 13,
                    color: "var(--cc-muted)",
                  }}
                />
                <input
                  autoComplete="current-password"
                  className="cc-input"
                  name="password"
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  style={{ paddingLeft: 40 }}
                  type="password"
                  value={formData.password}
                />
              </span>
            </label>
          </div>

          <button
            className="cc-button"
            disabled={loading}
            style={{ marginTop: 18, width: "100%" }}
            type="submit"
          >
            <FiLogIn />
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="auth-switch">
            New to Campus Connect? <Link to="/signup">Create an account</Link>
          </p>

          <p className="auth-switch" style={{ marginTop: 10 }}>
            <Link to="/forgot-password">Forgot password?</Link>
            {" | "}
            {verificationEmail ? (
              <Link
                to={`/verify-email?email=${encodeURIComponent(verificationEmail)}`}
              >
                Verify email
              </Link>
            ) : (
              <Link to="/verify-email">Verify email</Link>
            )}
          </p>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
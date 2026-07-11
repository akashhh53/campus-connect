import { useState } from "react";
import { Link } from "react-router";
import { FiMail, FiSend } from "react-icons/fi";

import AuthThemeToggle from "../components/AuthThemeToggle";
import { forgotPassword } from "../services/authService";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await forgotPassword({ email });
      setMessage(data.message || "Password reset email sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <AuthThemeToggle />
      <section className="auth-hero">
        <div className="cc-eyebrow">Password help</div>
        <h1>Get a reset link in your inbox.</h1>
        <p>
          We will send a password reset link to the same campus email used for
          your account.
        </p>

        <div className="auth-feature-grid">
          <div className="auth-feature">
            <strong>Secure link</strong>
            <span>The reset link expires after a short window.</span>
          </div>
          <div className="auth-feature">
            <strong>Email first</strong>
            <span>Only the registered email can request a reset.</span>
          </div>
          <div className="auth-feature">
            <strong>Fast recovery</strong>
            <span>Set a new password and sign back in right away.</span>
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <form className="auth-panel" onSubmit={handleSubmit}>
          <h2>Forgot password</h2>
          <p>Enter your email and we will send reset instructions.</p>

          {message && <div className="cc-alert cc-alert-success">{message}</div>}
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
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@college.edu"
                  required
                  style={{ paddingLeft: 40 }}
                  type="email"
                  value={email}
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
            <FiSend />
            {loading ? "Sending link..." : "Send reset link"}
          </button>

          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
};

export default ForgotPasswordPage;

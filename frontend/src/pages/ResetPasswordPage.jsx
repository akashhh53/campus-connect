import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { FiLock, FiSave } from "react-icons/fi";

import AuthThemeToggle from "../components/AuthThemeToggle";
import { resetPassword } from "../services/authService";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token } = useParams();

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await resetPassword({
        token,
        newPassword: formData.newPassword,
      });

      setMessage(data.message || "Password reset successful.");

      window.setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <AuthThemeToggle />
      <section className="auth-hero">
        <div className="cc-eyebrow">Reset password</div>
        <h1>Create a fresh password and get back in.</h1>
        <p>
          The reset link from your email unlocks this form for a short time.
          Once saved, the old password stops working.
        </p>

        <div className="auth-feature-grid">
          <div className="auth-feature">
            <strong>Short-lived link</strong>
            <span>Only the email link can open this page.</span>
          </div>
          <div className="auth-feature">
            <strong>Fresh start</strong>
            <span>All old refresh sessions are cleared after reset.</span>
          </div>
          <div className="auth-feature">
            <strong>Back to sign in</strong>
            <span>After saving, you can use the new password immediately.</span>
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <form className="auth-panel" onSubmit={handleSubmit}>
          <h2>Set new password</h2>
          <p>Choose a strong password and confirm it below.</p>

          {message && <div className="cc-alert cc-alert-success">{message}</div>}
          {error && <div className="cc-alert cc-alert-error">{error}</div>}

          <div className="cc-form-grid" style={{ marginTop: 16 }}>
            <label className="cc-field cc-field-full">
              <span className="cc-label">New password</span>
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
                  autoComplete="new-password"
                  className="cc-input"
                  name="newPassword"
                  onChange={handleChange}
                  placeholder="Enter new password"
                  required
                  style={{ paddingLeft: 40 }}
                  type="password"
                  value={formData.newPassword}
                />
              </span>
            </label>

            <label className="cc-field cc-field-full">
              <span className="cc-label">Confirm password</span>
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
                  autoComplete="new-password"
                  className="cc-input"
                  name="confirmPassword"
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  required
                  style={{ paddingLeft: 40 }}
                  type="password"
                  value={formData.confirmPassword}
                />
              </span>
            </label>
          </div>

          <button
            className="cc-button"
            disabled={loading || !token}
            style={{ marginTop: 18, width: "100%" }}
            type="submit"
          >
            <FiSave />
            {loading ? "Saving..." : "Reset password"}
          </button>

          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
};

export default ResetPasswordPage;

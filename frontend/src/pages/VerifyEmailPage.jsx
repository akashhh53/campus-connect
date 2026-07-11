import { useEffect, useState } from "react";

import { useDispatch } from "react-redux";

import { Link, useLocation, useNavigate, useSearchParams } from "react-router";

import { FiCheckCircle, FiRefreshCw, FiShield, FiSend } from "react-icons/fi";

import AuthThemeToggle from "../components/AuthThemeToggle";

import { setCredentials } from "../features/auth/authSlice";

import { resendOtp, verifyOtp, sendOtp } from "../services/authService";

const VerifyEmailPage = () => {
  const dispatch = useDispatch();

  const navigate = useNavigate();

  const location = useLocation();

  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");

  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);

  const [resending, setResending] = useState(false);

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState(location.state?.notice || "");

  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    const nextEmail = searchParams.get("email") || "";

    if (nextEmail) {
      setEmail(nextEmail);

      // Auto-send OTP if email is provided via URL param

      handleSendOtp(nextEmail);
    }
  }, [searchParams]);

  const handleSendOtp = async (emailToSend = email) => {
    if (!emailToSend) {
      setError("Please enter your email address first");

      return;
    }

    try {
      setSending(true);

      setError("");

      setMessage("");

      const data = await sendOtp({
        email: emailToSend,
      });

      setMessage(data.message || "Verification code sent to your email.");

      setOtpSent(true);
    } catch (err) {
      setError(
        err.code === "ECONNABORTED"
          ? "Server took too long to send the code. Please try again."
          : err.response?.data?.message || "Unable to send verification code",
      );

      setOtpSent(false);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);

      setError("");

      setMessage("");

      const data = await verifyOtp({
        email,

        otp,
      });

      dispatch(setCredentials(data));

      navigate("/dashboard/feed");
    } catch (err) {
      setError(
        err.code === "ECONNABORTED"
          ? "Server took too long to verify the OTP. Please try again."
          : err.response?.data?.message || "OTP verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);

      setError("");

      const data = await resendOtp({
        email,
      });

      setMessage(data.message || "Verification code sent again.");

      setOtpSent(true);
    } catch (err) {
      setError(
        err.code === "ECONNABORTED"
          ? "Server took too long to resend the code. Please try again."
          : err.response?.data?.message || "Unable to resend code",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-shell">
      <AuthThemeToggle />

      <section className="auth-hero">
        <div className="cc-eyebrow">Email verification</div>

        <h1>Confirm the student email before you enter the dashboard.</h1>

        <p>
          Your OTP keeps the account tied to the selected college. Once the code
          matches, we sign you in immediately.
        </p>

        <div className="auth-feature-grid">
          <div className="auth-feature">
            <strong>Campus bound</strong>

            <span>Only the selected college email can finish signup.</span>
          </div>

          <div className="auth-feature">
            <strong>One-time code</strong>

            <span>Enter the OTP from your inbox to unlock the account.</span>
          </div>

          <div className="auth-feature">
            <strong>Quick access</strong>

            <span>Verification creates the login session right away.</span>
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <form className="auth-panel" onSubmit={handleVerify}>
          <h2>Verify email</h2>

          <p>Check your inbox, then enter the 6-digit code here.</p>

          {message && (
            <div className="cc-alert cc-alert-success">{message}</div>
          )}

          {error && <div className="cc-alert cc-alert-error">{error}</div>}

          <div className="cc-form-grid" style={{ marginTop: 16 }}>
            <label className="cc-field cc-field-full">
              <span className="cc-label">Email</span>

              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  autoComplete="email"
                  className="cc-input"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@college.edu"
                  required
                  type="email"
                  value={email}
                  style={{ flex: 1 }}
                />

                <button
                  className="cc-button cc-button-secondary"
                  disabled={sending || !email}
                  onClick={() => handleSendOtp()}
                  type="button"
                  style={{ whiteSpace: "nowrap" }}
                >
                  <FiSend />

                  {sending ? "Sending..." : "Send code"}
                </button>
              </div>
            </label>

            <label className="cc-field cc-field-full">
              <span className="cc-label">OTP</span>

              <span style={{ position: "relative" }}>
                <FiShield
                  style={{
                    position: "absolute",

                    left: 12,

                    top: 13,

                    color: "var(--cc-muted)",
                  }}
                />

                <input
                  className="cc-input"
                  inputMode="numeric"
                  maxLength={6}
                  name="otp"
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Enter 6-digit code"
                  required
                  style={{ paddingLeft: 40, letterSpacing: "0.28em" }}
                  value={otp}
                  disabled={!otpSent}
                />
              </span>

              {!otpSent && (
                <small
                  style={{
                    color: "var(--cc-muted)",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Please click "Send code" to receive the OTP
                </small>
              )}
            </label>
          </div>

          <div className="cc-button-row" style={{ marginTop: 18 }}>
            <button
              className="cc-button"
              disabled={loading || !otpSent || !otp}
              type="submit"
            >
              <FiCheckCircle />

              {loading ? "Verifying..." : "Verify email"}
            </button>

            {otpSent && (
              <button
                className="cc-button cc-button-secondary"
                disabled={resending}
                onClick={handleResend}
                type="button"
              >
                <FiRefreshCw />

                {resending ? "Sending..." : "Resend code"}
              </button>
            )}
          </div>

          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
};

export default VerifyEmailPage;

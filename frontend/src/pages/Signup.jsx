import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router";
import { FiUserPlus } from "react-icons/fi";

import AuthThemeToggle from "../components/AuthThemeToggle";
import { setCredentials } from "../features/auth/authSlice";
import { registerUser } from "../services/authService";
import { getColleges } from "../services/collegeService";

const roles = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "alumni", label: "Alumni" },
];

const normalizeCollegeCode = (value = "") =>
  String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const getStudentEmailHint = (college) => {
  if (!college) {
    return "";
  }

  const primaryDomain =
    Array.isArray(college.emailDomains) && college.emailDomains.length > 0
      ? college.emailDomains[0]
      : `${normalizeCollegeCode(college.code)}.ac.in`;

  return primaryDomain;
};

const isStudentEmailCompatible = (email = "", college) => {
  if (!email || !college) {
    return false;
  }

  const [localPart = "", domain = ""] = String(email).trim().toLowerCase().split("@");
  const collegeCode = normalizeCollegeCode(college.code);
  const domainHint = getStudentEmailHint(college);
  const normalizedDomain = domain.trim();
  const allowedDomains = new Set(
    [
      domainHint,
      ...(Array.isArray(college.emailDomains) ? college.emailDomains : []),
    ]
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean),
  );

  if (!localPart || !normalizedDomain || !collegeCode) {
    return false;
  }

  const hasStudentTag = /(?:\.ug|\.pg)\d*/i.test(localPart);
  const firstLabel = normalizedDomain.split(".")[0];

  return (
    hasStudentTag &&
    (allowedDomains.has(normalizedDomain) ||
      firstLabel === collegeCode ||
      normalizedDomain === collegeCode ||
      normalizedDomain.startsWith(`${collegeCode}.`) ||
      normalizedDomain.includes(`.${collegeCode}.`))
  );
};

const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    role: "student",
    collegeId: "",
  });
  const [colleges, setColleges] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedCollege = colleges.find(
    (college) => college._id === formData.collegeId,
  );
  const studentEmailHint = getStudentEmailHint(selectedCollege);
  const studentEmailMismatch =
    formData.role === "student" &&
    Boolean(formData.email) &&
    Boolean(selectedCollege) &&
    !isStudentEmailCompatible(formData.email, selectedCollege);

  useEffect(() => {
    const loadColleges = async () => {
      try {
        setLoadingColleges(true);
        const data = await getColleges();
        const list = data.colleges || [];
        setColleges(list);

      } catch (err) {
        setError(err.response?.data?.message || "Unable to load colleges");
      } finally {
        setLoadingColleges(false);
      }
    };

    loadColleges();
  }, []);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (studentEmailMismatch) {
        setError(
          `Student email must match ${studentEmailHint} and include .ug or .pg in the username.`,
        );
        return;
      }

      setSubmitting(true);
      setError("");
      const data = await registerUser(formData);

      if (data.requiresEmailVerification) {
        navigate(
          `/verify-email?email=${encodeURIComponent(data.email || formData.email)}`,
          {
            state: {
              notice: data.message,
            },
          },
        );
        return;
      }

      dispatch(setCredentials(data));
      navigate("/dashboard/feed");
    } catch (err) {
      if (err.response?.data?.requiresEmailVerification) {
        navigate(
          `/verify-email?email=${encodeURIComponent(
            err.response?.data?.email || formData.email,
          )}`,
          {
            state: {
              notice: err.response?.data?.message,
            },
          },
        );
        return;
      }

      setError(
        err.response?.data?.errors ||
          err.response?.data?.message ||
          "Registration failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <AuthThemeToggle />
      <section className="auth-hero">
        <div className="cc-eyebrow">Join Campus Connect</div>
        <h1>Start with your verified campus identity.</h1>
        <p>
          Choose your college and role so the dashboard can unlock the right
          modules from the backend.
        </p>

        <div className="auth-feature-grid">
          <div className="auth-feature">
            <strong>Role-aware access</strong>
            <span>Students, teachers, and alumni see the modules they need.</span>
          </div>
          <div className="auth-feature">
            <strong>Campus scoped</strong>
            <span>Feed and lost-found results stay tied to your college.</span>
          </div>
          <div className="auth-feature">
            <strong>Verification first</strong>
            <span>Student accounts unlock only after the email OTP is confirmed.</span>
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <form className="auth-panel" onSubmit={handleSubmit}>
          <h2>Create account</h2>
          <p>Use a strong password with uppercase, lowercase, number, and symbol.</p>

          {error && <div className="cc-alert cc-alert-error">{error}</div>}

          <div className="cc-form-grid" style={{ marginTop: 16 }}>
            <label className="cc-field cc-field-full">
              <span className="cc-label">Full name</span>
              <input
                className="cc-input"
                name="name"
                onChange={handleChange}
                placeholder="Your name"
                required
                value={formData.name}
              />
            </label>

            <label className="cc-field cc-field-full">
              <span className="cc-label">Email</span>
              <input
                autoComplete="email"
                className="cc-input"
                name="email"
                onChange={handleChange}
                placeholder="you@college.edu"
                required
                type="email"
                value={formData.email}
              />
              {formData.role === "student" && selectedCollege && (
                <span
                  style={{
                    color: studentEmailMismatch
                      ? "var(--cc-danger)"
                      : "var(--cc-muted)",
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1.45,
                  }}
                >
                  Student email should look like
                  {" "}
                  <strong>
                    name.ug23@{studentEmailHint || "yourcollege.ac.in"}
                  </strong>
                  {" "}
                  or
                  {" "}
                  <strong>name.pg23@{studentEmailHint || "yourcollege.ac.in"}</strong>.
                </span>
              )}
            </label>

            <label className="cc-field">
              <span className="cc-label">Phone</span>
              <input
                className="cc-input"
                name="phone"
                onChange={handleChange}
                placeholder="+91..."
                value={formData.phone}
              />
            </label>

            <label className="cc-field">
              <span className="cc-label">Date of birth</span>
              <input
                className="cc-input cc-date-input"
                name="dateOfBirth"
                onChange={handleChange}
                required
                type="date"
                value={formData.dateOfBirth}
              />
            </label>

            <label className="cc-field">
              <span className="cc-label">Role</span>
              <select
                className="cc-select"
                name="role"
                onChange={handleChange}
                value={formData.role}
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="cc-field">
              <span className="cc-label">College</span>
              <select
                className="cc-select"
                disabled={loadingColleges || colleges.length === 0}
                name="collegeId"
                onChange={handleChange}
                required
                value={formData.collegeId}
              >
                {loadingColleges ? (
                  <option value="">Loading colleges...</option>
                ) : colleges.length === 0 ? (
                  <option value="">No colleges available</option>
                ) : (
                  <>
                    <option value="">Choose your college</option>
                    {colleges.map((college) => (
                      <option key={college._id} value={college._id}>
                        {college.name} ({college.code})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>

            <label className="cc-field cc-field-full">
              <span className="cc-label">Password</span>
              <input
                autoComplete="new-password"
                className="cc-input"
                name="password"
                onChange={handleChange}
                placeholder="Strong password"
                required
                type="password"
                value={formData.password}
              />
            </label>
          </div>

          <button
            className="cc-button"
            disabled={submitting || loadingColleges || colleges.length === 0}
            style={{ marginTop: 18, width: "100%" }}
            type="submit"
          >
            <FiUserPlus />
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
};

export default Signup;

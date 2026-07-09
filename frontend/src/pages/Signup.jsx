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

  useEffect(() => {
    const loadColleges = async () => {
      try {
        setLoadingColleges(true);
        const data = await getColleges();
        const list = data.colleges || [];
        setColleges(list);

        if (list.length > 0) {
          setFormData((current) => ({
            ...current,
            collegeId: current.collegeId || list[0]._id,
          }));
        }
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
      setSubmitting(true);
      setError("");
      const data = await registerUser(formData);

      dispatch(setCredentials(data));
      navigate("/dashboard/feed");
    } catch (err) {
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
            <strong>Ready to use</strong>
            <span>Your account is signed in immediately after registration.</span>
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
                className="cc-input"
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
                  colleges.map((college) => (
                    <option key={college._id} value={college._id}>
                      {college.name} ({college.code})
                    </option>
                  ))
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

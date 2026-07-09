import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem("cc-theme");

  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const AuthThemeToggle = () => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cc-theme", theme);
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      aria-label={`Switch to ${nextTheme} theme`}
      className="auth-theme-toggle"
      onClick={() => setTheme(nextTheme)}
      title={`Switch to ${nextTheme} theme`}
      type="button"
    >
      {theme === "dark" ? <FiSun /> : <FiMoon />}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
};

export default AuthThemeToggle;

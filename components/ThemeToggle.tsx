"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("carrete-theme", theme);
  }, [theme]);

  return (
    <button
      aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
      className="theme-toggle"
      onClick={() =>
        setTheme((current) => (current === "dark" ? "light" : "dark"))
      }
      type="button"
    >
      <span aria-hidden="true">{theme === "dark" ? "☾" : "☼"}</span>
    </button>
  );
}

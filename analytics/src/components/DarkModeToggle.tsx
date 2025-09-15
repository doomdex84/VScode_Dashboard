import React, { useEffect, useState } from "react";

function applyTheme(theme: "light"|"dark") {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export default function DarkModeToggle() {
  const [theme, setTheme] = useState<"light"|"dark">(
    (localStorage.getItem("theme") as "light"|"dark") || "light"
  );

  useEffect(() => { applyTheme(theme); localStorage.setItem("theme", theme); }, [theme]);

  return (
    <button
      aria-label="Toggle dark mode"
      className="px-3 py-2 rounded border text-sm
                 hover:bg-gray-100 dark:hover:bg-gray-800
                 dark:border-gray-700"
      onClick={() => setTheme(t => (t === "light" ? "dark" : "light"))}
    >
      {theme === "light" ? "🌙 다크모드" : "☀️ 라이트모드"}
    </button>
  );
}

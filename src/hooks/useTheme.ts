import { useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "pdf-toolkit:theme";

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", choice);
  }
}

function readStoredTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage can throw in private browsing / blocked storage — fall
    // back to system preference rather than crash.
  }
  return "system";
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (choice: ThemeChoice) => {
    setThemeState(choice);
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Best-effort persistence only — the UI still works this session
      // even if the write is blocked.
    }
  };

  return { theme, setTheme };
}

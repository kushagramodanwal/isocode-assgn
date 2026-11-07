/** Light / dark. Default follows the phone; a tap on the toggle stores the person's choice. */
export type Theme = "light" | "dark";

const KEY = "theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function storedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(KEY);
    return t === "dark" || t === "light" ? t : null;
  } catch {
    return null;
  }
}

export function effectiveTheme(): Theme {
  return storedTheme() ?? (media().matches ? "dark" : "light");
}

export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t); } catch { /* private mode: still applies for this visit */ }
  document.documentElement.setAttribute("data-theme", t);
  // Browser chrome (status bar) follows the chosen theme, not only the system one.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", t === "dark" ? "#111213" : "#ffffff"));
}

/** Calls back when the system setting changes and the person hasn't picked a theme. */
export function onSystemThemeChange(cb: (t: Theme) => void): () => void {
  const m = media();
  const handler = () => { if (!storedTheme()) cb(m.matches ? "dark" : "light"); };
  m.addEventListener("change", handler);
  return () => m.removeEventListener("change", handler);
}

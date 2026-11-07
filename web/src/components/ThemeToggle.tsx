import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { effectiveTheme, onSystemThemeChange, setTheme, type Theme } from "../lib/theme";

/** One icon button: shows the theme you would switch to. 48px target, labelled for screen readers. */
export function ThemeToggle({ lang = "en" }: { lang?: "en" | "hi" }) {
  const [theme, setLocal] = useState<Theme>(() => effectiveTheme());
  useEffect(() => onSystemThemeChange(setLocal), []);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = lang === "hi" ? (next === "dark" ? "डार्क मोड" : "लाइट मोड") : next === "dark" ? "Dark mode" : "Light mode";
  return (
    <button type="button" aria-label={label} title={label}
      className="flex h-12 w-11 items-center justify-center text-[var(--color-muted)] active:opacity-60"
      onClick={() => { setTheme(next); setLocal(next); }}>
      {next === "dark" ? <Moon size={18} strokeWidth={1.5} aria-hidden /> : <Sun size={18} strokeWidth={1.5} aria-hidden />}
    </button>
  );
}

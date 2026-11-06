"use client";
import { useTransition } from "react";
import { setLanguage } from "@/app/shop/actions";
import type { Lang } from "@/lib/i18n";

export function LangToggle({ lang }: { lang: Lang }) {
  const [pending, start] = useTransition();
  const next = lang === "en" ? "hi" : "en";
  return (
    <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => start(() => setLanguage(next))} lang={next}>
      {next === "hi" ? "हिंदी" : "English"}
    </button>
  );
}

import { useState } from "react";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import type { Lang } from "../../../shared/i18n";

/** Plain text switch, written in the language it switches to. */
export function LangToggle({ lang }: { lang: Lang }) {
  const [pending, setPending] = useState(false);
  const { refresh } = useSession();
  const next = lang === "en" ? "hi" : "en";
  return (
    <button type="button" className="btn btn-ghost btn-sm" disabled={pending} lang={next}
      onClick={async () => { setPending(true); await api.put("/me/lang", { lang: next }).catch(() => {}); await refresh(); setPending(false); }}>
      {next === "hi" ? "हिंदी" : "English"}
    </button>
  );
}

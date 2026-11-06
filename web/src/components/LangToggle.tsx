import { useState } from "react";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import type { Lang } from "../../../shared/i18n";

export function LangToggle({ lang }: { lang: Lang }) {
  const [pending, setPending] = useState(false);
  const { refresh } = useSession();
  const next = lang === "en" ? "hi" : "en";
  return (
    <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={async () => { setPending(true); await api.put("/me/lang", { lang: next }).catch(() => {}); await refresh(); setPending(false); }} lang={next}>
      {next === "hi" ? "हिंदी" : "English"}
    </button>
  );
}

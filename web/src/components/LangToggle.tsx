import { useState } from "react";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import type { Lang } from "../../../shared/i18n";

/** Always-visible हिं / EN switch. Both options show, the current one is marked, 48px tall. */
export function LangToggle({ lang }: { lang: Lang }) {
  const [pending, setPending] = useState(false);
  const { refresh } = useSession();
  async function choose(next: Lang) {
    if (next === lang || pending) return;
    setPending(true);
    await api.put("/me/lang", { lang: next }).catch(() => {});
    await refresh();
    setPending(false);
  }
  return (
    <div className="flex h-12 items-center" role="radiogroup" aria-label="Language / भाषा">
      {(["hi", "en"] as const).map((l, i) => (
        <span key={l} className="flex items-center">
          {i === 1 && <span className="text-[var(--color-line)]" aria-hidden>/</span>}
          <button type="button" role="radio" aria-checked={lang === l} lang={l} disabled={pending}
            onClick={() => choose(l)}
            className={`flex h-12 min-w-11 items-center justify-center px-2 ${lang === l ? "font-semibold text-[var(--color-accent-fg)]" : "text-[var(--color-muted)]"}`}>
            {l === "hi" ? "हिं" : "EN"}
          </button>
        </span>
      ))}
    </div>
  );
}

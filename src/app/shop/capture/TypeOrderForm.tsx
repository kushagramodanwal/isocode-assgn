"use client";
import { useActionState } from "react";
import { createOwnCapture, type CreateState } from "@/app/capture/actions";
import { dict, type Lang } from "@/lib/i18n";

export function TypeOrderForm({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const [state, action, pending] = useActionState(createOwnCapture, {} as CreateState);
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="text" className="sr-only">{t.typeTitle}</label>
      <textarea id="text" name="text" className="field" maxLength={2000} placeholder={t.typePlaceholder} defaultValue={state.text} aria-describedby="text-error" required />
      {state.error && <p id="text-error" role="alert" className="text-sm text-[var(--color-danger)]">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? t.reading : t.readOrder}</button>
    </form>
  );
}

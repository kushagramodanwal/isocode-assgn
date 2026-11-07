import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CatalogueItem } from "../../../shared/catalogue";
import { toPriced } from "../../../shared/catalogue";
import { confidenceLevel, type ConfidenceLevel } from "../../../shared/capture/match";
import { priceCart } from "../../../shared/pricing";
import { api, ApiFailure } from "../lib/api";
import type { CaptureView, ConfirmResult, ReviewedLineDto } from "../../../shared/api";
import { PackArt } from "./PackArt";
import { pct, rupees } from "../../../shared/money";
import type { Lang } from "../../../shared/i18n";

type Line = {
  id: string;
  rawText: string;
  qty: number | null;
  unit: "CASE" | "PIECE" | "UNKNOWN";
  productId: string | null;
  confidence: number;
  matchedBy: string;
  alternatives: { productId: string; score: number }[];
};

type Props = {
  lang: Lang;
  role: "DESK" | "RETAILER";
  capture: Pick<CaptureView, "id" | "rawText" | "parser" | "parserNote" | "status" | "lines" | "source" | "hasMedia">;
  catalogue: CatalogueItem[];
};

type State = {
  removed: boolean;
  productId: string | null;
  cases: number | null;
  unitAnswer: "CASE" | "PIECE" | null;
  checked: boolean;
  substituted: boolean;
};

type Strings = typeof en;
const en = {
    original: "Message",
    transcript: "What the AI read",
    photo: "Their photo",
    voice: "Their voice note",
    readBy: (p: string): string => (p === "rules" ? "Read by the rule-based reader" : p.includes("→") ? "Transcribed and read by AI" : `Read by AI (${p.replace("llm:", "")})`),
    theyWrote: "Their words",
    confidence: { high: "Sure", medium: "Check", low: "Unsure" } as Record<ConfidenceLevel, string>,
    why: { alias: "Learned from an earlier correction for this shop", history: "Picked from this shop's past orders", catalogue: "Matched by product name", ai: "Suggested by the AI reader: their words alone don't say this, so check it", none: "No product matched these words" } as Record<string, string>,
    notMatched: "Choose the product",
    alternatives: "Or did they mean",
    allProducts: "Pick from all products…",
    unitQ: (u: string): string => (u === "PIECE" ? "They wrote pieces/packets. We sell by the case. Which did they mean?" : "Unit not clear. Cases or pieces?"),
    cases: "Cases",
    pieces: "Pieces",
    piecesAs: (pcs: number, per: number) => `${pcs} pieces = ${pcs / per} case${pcs / per === 1 ? "" : "s"} of ${per}`,
    piecesOdd: (pcs: number, per: number) => `${pcs} pieces is not a whole number of cases (${per} per case). Enter cases:`,
    qty: "Cases",
    qtyMissing: "Quantity not given. Enter cases:",
    checked: "I've checked this line",
    remove: "Remove line",
    restore: "Put back",
    removed: "Removed",
    outOfStock: "Out of stock",
    substitute: (p: string) => `Substitute ${p}`,
    substituted: "Substitute (not saved as a correction)",
    changedByYou: "Changed by you. Saved as this shop's word for it.",
    stock: (n: number) => `${n} cases in stock`,
    preview: "Order preview",
    total: "Total incl. GST",
    free: "free",
    confirm: "Confirm order",
    confirming: "Placing order…",
    discard: "Discard message",
    needs: (n: number) => `${n} line${n === 1 ? "" : "s"} still need${n === 1 ? "s" : ""} an answer`,
    problem: { no_product: "Choose a product", no_qty: "Enter cases", unit: "Answer case or piece", unchecked: "Tick when checked", unknown_product: "Product no longer sold" } as Record<string, string>,
    done: "This message is already handled.",
    blockedHint: "A line is out of stock or above stock. Substitute or remove it.",
};
const hi: Strings = {
    original: "मैसेज",
    transcript: "AI ने यह पढ़ा",
    photo: "आपकी फ़ोटो",
    voice: "आपका वॉइस नोट",
    readBy: (p: string): string => (p === "rules" ? "नियम-आधारित रीडर ने पढ़ा" : p.includes("→") ? "AI ने सुनकर/देखकर पढ़ा" : `AI ने पढ़ा (${p.replace("llm:", "")})`),
    theyWrote: "आपके शब्द",
    confidence: { high: "पक्का", medium: "जाँचें", low: "पक्का नहीं" } as Record<ConfidenceLevel, string>,
    why: { alias: "पिछले सुधार से सीखा", history: "आपके पिछले ऑर्डर से", catalogue: "नाम से मिलाया", ai: "AI का सुझाव: जाँच लें", none: "कोई सामान नहीं मिला" } as Record<string, string>,
    notMatched: "सामान चुनें",
    alternatives: "या यह था?",
    allProducts: "सभी सामान में से चुनें…",
    unitQ: (u: string): string => (u === "PIECE" ? "आपने पैकेट लिखा है। हम पेटी में बेचते हैं। क्या मतलब था?" : "पेटी या पैकेट, साफ़ नहीं है। कौन सा?"),
    cases: "पेटी",
    pieces: "पैकेट",
    piecesAs: (pcs: number, per: number) => `${pcs} पैकेट = ${pcs / per} पेटी (${per} प्रति पेटी)`,
    piecesOdd: (pcs: number, per: number) => `${pcs} पैकेट पूरी पेटी नहीं बनते (${per} प्रति पेटी)। पेटी लिखें:`,
    qty: "पेटी",
    qtyMissing: "मात्रा नहीं लिखी। पेटी लिखें:",
    checked: "मैंने जाँच लिया",
    remove: "हटाएँ",
    restore: "वापस जोड़ें",
    removed: "हटाया गया",
    outOfStock: "स्टॉक ख़त्म",
    substitute: (p: string) => `${p} भेजें`,
    substituted: "बदला गया (स्टॉक के कारण)",
    changedByYou: "आपने बदला। अगली बार याद रहेगा।",
    stock: (n: number) => `${n} पेटी स्टॉक में`,
    preview: "ऑर्डर",
    total: "कुल (GST सहित)",
    free: "मुफ़्त",
    confirm: "ऑर्डर पक्का करें",
    confirming: "ऑर्डर हो रहा है…",
    discard: "मैसेज हटाएँ",
    needs: (n: number) => `${n} लाइन में जवाब बाकी`,
    problem: { no_product: "सामान चुनें", no_qty: "पेटी लिखें", unit: "पेटी या पैकेट चुनें", unchecked: "जाँच कर टिक करें", unknown_product: "यह सामान अब नहीं बिकता" } as Record<string, string>,
    done: "यह मैसेज पहले ही निपट गया है।",
    blockedHint: "एक सामान स्टॉक में नहीं है। बदलें या हटाएँ।",
};
const L: Record<Lang, Strings> = { en, hi };

function initial(l: Line): State {
  const level = confidenceLevel(l.confidence);
  return {
    removed: false,
    productId: l.productId,
    cases: l.unit === "CASE" ? l.qty : null,
    unitAnswer: l.unit === "CASE" ? "CASE" : null,
    checked: level === "high" && l.productId !== null,
    substituted: false,
  };
}

export function CaptureReview({ lang, role, capture, catalogue }: Props) {
  const s = L[lang];
  const navigate = useNavigate();
  const byId = useMemo(() => new Map(catalogue.map((c) => [c.id, c])), [catalogue]);
  const [state, setState] = useState<Record<string, State>>(() => Object.fromEntries(capture.lines.map((l) => [l.id, initial(l)])));
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [pending, setPending] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const update = (id: string, patch: Partial<State>) => setState((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));

  const unresolved = capture.lines.filter((l) => {
    const st = state[l.id]!;
    if (st.removed) return false;
    const unitOk = l.unit === "CASE" || st.unitAnswer !== null;
    const checkOk = st.checked || st.productId !== l.productId;
    return !st.productId || !st.cases || st.cases < 1 || !unitOk || !checkOk;
  });

  const kept = capture.lines.filter((l) => !state[l.id]!.removed && state[l.id]!.productId && state[l.id]!.cases);
  const priced = useMemo(() => new Map(catalogue.map((c) => [c.id, toPriced(c)])), [catalogue]);
  const quote = priceCart(kept.map((l) => ({ productId: state[l.id]!.productId!, cases: state[l.id]!.cases! })), priced, new Date());
  const serverProblems = new Map((result && !result.ok ? result.problems ?? [] : []).map((p) => [p.lineId, p.problem]));

  if (capture.status !== "NEEDS_REVIEW") {
    return <p className="card p-6 text-center text-[var(--color-muted)]">{s.done}</p>;
  }

  async function confirm() {
    setResult(null);
    setPending(true);
    const lines: ReviewedLineDto[] = capture.lines.map((l) => {
      const st = state[l.id]!;
      return {
        lineId: l.id,
        removed: st.removed,
        productId: st.productId,
        cases: st.cases,
        unitConfirmed: l.unit === "CASE" || st.unitAnswer !== null,
        checked: st.checked,
        substituted: st.substituted,
      };
    });
    try {
      const r = await api.post<ConfirmResult>(`/captures/${capture.id}/confirm`, { lines });
      setResult(r);
      if (r.ok) navigate(role === "DESK" ? `/desk/orders/${r.orderId}?from=capture&learned=${r.learned}` : `/shop/orders/${r.orderId}?placed=1`);
    } catch (e) {
      setResult({ ok: false, message: e instanceof ApiFailure && !e.offline ? e.message : "Could not reach the server. Try again." });
    } finally {
      setPending(false);
    }
  }

  async function discard() {
    setDiscarding(true);
    await api.post(`/captures/${capture.id}/discard`).catch(() => {});
    navigate(role === "DESK" ? "/desk" : "/shop/capture");
  }

  return (
    <div className="space-y-4">
      {capture.hasMedia && (
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">{capture.source === "PHOTO" ? s.photo : s.voice}</h2>
          {capture.source === "PHOTO" ? (
            <a href={`/api/captures/${capture.id}/media`} target="_blank" rel="noreferrer">
              <img src={`/api/captures/${capture.id}/media`} alt={s.photo} className="max-h-[28rem] w-full rounded-lg bg-[var(--color-bg)] object-contain" />
            </a>
          ) : (
            <audio src={`/api/captures/${capture.id}/media`} controls preload="metadata" className="w-full" />
          )}
        </section>
      )}

      <section className="card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-muted)]">{capture.hasMedia ? s.transcript : s.original}</h2>
          <span className="text-xs text-[var(--color-faint)]">{s.readBy(capture.parser)}</span>
        </div>
        <blockquote className="whitespace-pre-wrap rounded-xl bg-[var(--color-bg)] px-4 py-3 text-[15px] leading-relaxed">{capture.rawText}</blockquote>
        {capture.parserNote && <p className="mt-2 text-xs text-[var(--color-warn)]">{capture.parserNote}</p>}
      </section>

      <ol className="space-y-3">
        {capture.lines.map((l, i) => (
          <ReviewLine key={l.id} index={i} line={l} st={state[l.id]!} s={s} lang={lang} byId={byId} catalogue={catalogue}
            problem={serverProblems.get(l.id)} onChange={(p) => update(l.id, p)} />
        ))}
      </ol>

      <section className="card p-4" aria-label={s.preview}>
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">{s.preview}</h2>
        {quote.lines.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">—</p>
        ) : (
          <ul className="num space-y-1 text-sm">
            {quote.lines.map((q) => {
              const p = byId.get(q.productId)!;
              return (
                <li key={q.productId} className="flex justify-between gap-3">
                  <span className={q.blocked ? "text-[var(--color-danger)]" : ""}>
                    {q.cases} × {lang === "hi" ? p.nameHi : p.name} {p.packLabel}
                    {q.freeCases > 0 && <span className="text-[var(--color-accent)]"> +{q.freeCases} {s.free}</span>}
                    {q.discountPaise > 0 && q.scheme?.type === "SLAB_DISCOUNT" && <span className="text-[var(--color-accent)]"> −{pct(q.scheme.percentBp)}</span>}
                    {q.blocked && ` · ${s.outOfStock}`}
                  </span>
                  <span>{q.blocked ? "—" : rupees(q.totalPaise)}</span>
                </li>
              );
            })}
            <li className="flex justify-between border-t border-[var(--color-line)] pt-2 text-base font-semibold"><span>{s.total}</span><span>{rupees(quote.totals.totalPaise)}</span></li>
          </ul>
        )}
      </section>

      {result && !result.ok && <p role="alert" className="rounded-xl bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">{result.message}</p>}

      <div className={`sticky -mx-4 space-y-2 border-t border-[var(--color-line)] bg-[var(--color-bg)] px-4 pt-3 pb-3 ${role === "RETAILER" ? "bottom-16" : "bottom-0"}`}>
        {unresolved.length > 0 ? (
          <p className="text-center text-sm text-[var(--color-warn)]">{s.needs(unresolved.length)}</p>
        ) : quote.blocked && quote.lines.length > 0 ? (
          <p className="text-center text-sm text-[var(--color-danger)]">{s.blockedHint}</p>
        ) : null}
        <div className="flex gap-2">
          <button className="btn btn-secondary" disabled={discarding || pending} onClick={discard}>{s.discard}</button>
          <button className="btn btn-primary flex-1" disabled={pending || unresolved.length > 0 || quote.blocked} onClick={confirm}>
            {pending ? s.confirming : `${s.confirm}${quote.lines.length ? ` · ${rupees(quote.totals.totalPaise)}` : ""}`}
          </button>
        </div>
        {role === "DESK" && <p className="text-center text-xs text-[var(--color-faint)]">Changing a product saves it as this shop&apos;s word for that SKU. Substitutes are not saved.</p>}
      </div>
    </div>
  );
}

function ReviewLine({ index, line, st, s, lang, byId, catalogue, problem, onChange }: {
  index: number; line: Line; st: State; s: Strings; lang: Lang; byId: Map<string, CatalogueItem>; catalogue: CatalogueItem[];
  problem?: string; onChange: (p: Partial<State>) => void;
}) {
  const level = confidenceLevel(line.confidence);
  const product = st.productId ? byId.get(st.productId) : undefined;
  const changed = st.productId !== line.productId;
  const tone = changed ? "pill-muted" : level === "high" ? "pill-accent" : level === "medium" ? "pill-warn" : "pill-danger";
  const name = (p: CatalogueItem) => `${lang === "hi" ? p.nameHi : p.name} ${p.packLabel}`;
  const out = product && product.stockCases <= 0;
  const sub = out ? catalogue.find((c) => c.name === product.name && c.id !== product.id && c.stockCases > 0) : undefined;
  const alts = line.alternatives.map((a) => byId.get(a.productId)).filter((p): p is CatalogueItem => !!p && p.id !== st.productId);
  const needsUnit = line.unit !== "CASE";

  function choose(id: string, substituted = false) {
    const p = byId.get(id);
    let cases = st.cases;
    if (st.unitAnswer === "PIECE" && line.qty && p) cases = line.qty % p.unitsPerCase === 0 ? line.qty / p.unitsPerCase : null;
    onChange({ productId: id, substituted, checked: true, cases });
  }

  function answerUnit(u: "CASE" | "PIECE") {
    if (u === "CASE") onChange({ unitAnswer: u, cases: line.qty ?? st.cases });
    else {
      const per = product?.unitsPerCase;
      onChange({ unitAnswer: u, cases: per && line.qty && line.qty % per === 0 ? line.qty / per : null });
    }
  }

  if (st.removed) {
    return (
      <li className="card flex items-center justify-between gap-3 p-3 opacity-70">
        <span className="text-sm"><span className="text-[var(--color-faint)]">{index + 1}. </span><s>{line.rawText}</s> · {s.removed}</span>
        <button className="btn btn-sm btn-secondary" onClick={() => onChange({ removed: false })}>{s.restore}</button>
      </li>
    );
  }

  return (
    <li className={`card p-4 ${problem ? "ring-2 ring-[var(--color-danger)]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm">
          <span className="text-[var(--color-faint)]">{index + 1}. {s.theyWrote}: </span>
          <q className="font-medium">{line.rawText}</q>
        </p>
        {!changed && <span className={`pill ${tone}`} title={s.why[line.matchedBy]}>{s.confidence[level]} · {line.confidence}%</span>}
      </div>
      <p className="mt-0.5 text-xs text-[var(--color-faint)]">{changed ? (st.substituted ? s.substituted : s.changedByYou) : s.why[line.matchedBy]}</p>

      {product ? (
        <div className="mt-3 flex items-center gap-3">
          <PackArt kind={product.image} brand={product.brand} label={product.packLabel} size={52} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">{name(product)}</p>
            <p className="num text-xs text-[var(--color-muted)]">
              {rupees(product.unitPricePaise * product.unitsPerCase)}/case · {product.unitsPerCase}/case ·{" "}
              {out ? <span className="font-semibold text-[var(--color-danger)]">{s.outOfStock}</span> : s.stock(product.stockCases)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-[var(--color-danger)]">{s.notMatched}</p>
      )}

      {out && sub && (
        <button className="btn btn-sm btn-primary mt-3" onClick={() => choose(sub.id, true)}>{s.substitute(name(sub))}</button>
      )}

      {alts.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-[var(--color-muted)]">{s.alternatives}</p>
          <div className="flex flex-wrap gap-2">
            {alts.slice(0, 2).map((a) => (
              <button key={a.id} className="btn btn-sm btn-secondary" onClick={() => choose(a.id)}>{name(a)}{a.stockCases <= 0 ? ` · ${s.outOfStock}` : ""}</button>
            ))}
          </div>
        </div>
      )}

      <label className="sr-only" htmlFor={`pick-${line.id}`}>{s.allProducts}</label>
      <select id={`pick-${line.id}`} className="field mt-2 text-sm" value="" onChange={(e) => e.target.value && choose(e.target.value)}>
        <option value="">{s.allProducts}</option>
        {catalogue.map((c) => (
          <option key={c.id} value={c.id} disabled={c.id === st.productId}>{name(c)}{c.stockCases <= 0 ? ` (${s.outOfStock})` : ""}</option>
        ))}
      </select>

      {needsUnit && (
        <fieldset className="mt-3 rounded-xl bg-[var(--color-warn-soft)] p-3">
          <legend className="sr-only">{s.unitQ(line.unit)}</legend>
          <p className="mb-2 text-sm text-[var(--color-warn)]">{s.unitQ(line.unit)}{line.qty ? ` (${line.qty})` : ""}</p>
          <div className="flex gap-2">
            {(["CASE", "PIECE"] as const).map((u) => (
              <button key={u} type="button" aria-pressed={st.unitAnswer === u} onClick={() => answerUnit(u)}
                className={`btn btn-sm flex-1 ${st.unitAnswer === u ? "btn-primary" : "btn-secondary"}`}>{u === "CASE" ? s.cases : s.pieces}</button>
            ))}
          </div>
          {st.unitAnswer === "PIECE" && product && line.qty !== null && (
            <p className="mt-2 text-sm">{line.qty % product.unitsPerCase === 0 ? s.piecesAs(line.qty, product.unitsPerCase) : s.piecesOdd(line.qty, product.unitsPerCase)}</p>
          )}
        </fieldset>
      )}

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <label htmlFor={`qty-${line.id}`} className="label">{line.qty === null && !st.cases ? s.qtyMissing : s.qty}</label>
          <input id={`qty-${line.id}`} inputMode="numeric" className="field num w-28 text-lg font-semibold"
            value={st.cases ?? ""} onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, "").slice(0, 3));
              onChange({ cases: n > 0 ? n : null });
            }} />
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => onChange({ removed: true })}>{s.remove}</button>
      </div>

      {(level !== "high" || line.productId === null) && !changed && (
        <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-line)] px-3">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent)]" checked={st.checked} onChange={(e) => onChange({ checked: e.target.checked })} />
          <span className="text-sm font-medium">{s.checked}</span>
        </label>
      )}
      {problem && <p className="mt-2 text-sm font-medium text-[var(--color-danger)]">{s.problem[problem]}</p>}
    </li>
  );
}

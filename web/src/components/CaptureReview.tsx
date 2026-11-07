import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { CatalogueItem } from "../../../shared/catalogue";
import { toPriced } from "../../../shared/catalogue";
import { confidenceLevel } from "../../../shared/capture/match";
import { priceCart } from "../../../shared/pricing";
import { api, ApiFailure } from "../lib/api";
import type { CaptureView, ConfirmResult, ReviewedLineDto } from "../../../shared/api";
import { PackArt } from "./PackArt";
import { ProductSheet } from "./ProductSheet";
import { pct, rupees } from "../../../shared/money";
import type { Lang } from "../../../shared/i18n";

type Line = CaptureView["lines"][number];
type Unit = "CASE" | "PIECE";

type Props = {
  lang: Lang;
  role: "DESK" | "RETAILER";
  capture: Pick<CaptureView, "id" | "rawText" | "parser" | "status" | "lines" | "source" | "hasMedia">;
  catalogue: CatalogueItem[];
};

/** What a person has decided for one line. Quantity is in the chosen unit. */
type State = {
  removed: boolean;
  productId: string | null;
  qty: number | null;
  unit: Unit | null;
  checked: boolean;
  substituted: boolean;
  /** Corrected lines only: remember the shop's words for the chosen SKU. */
  saveAlias: boolean;
  open: boolean;
};

type Issue = "product" | "stock" | "qty" | "unit" | "wholeCase" | "check";

const en = {
  message: "Their message",
  photo: "View their photo",
  voice: "Play their voice note",
  hide: "Hide",
  aiRead: "Read by AI",
  change: "Change",
  choose: "Choose product",
  match: (n: number) => `${n}% match`,
  aiMatch: (n: number) => `AI suggestion · ${n}%`,
  learned: "Your usual word",
  perCase: "/ case",
  stock: (n: number) => `${n} in stock`,
  out: "Out of stock",
  cases: "Cases",
  pieces: "Pieces",
  qty: "Quantity",
  perCaseConv: (n: number) => `1 case = ${n} pieces`,
  piecesAs: (pcs: number, cases: number) => `${pcs} pieces = ${cases} case${cases === 1 ? "" : "s"}`,
  issue: {
    product: "Choose the product",
    stock: "Out of stock. Change or remove it",
    qty: "Enter the quantity",
    unit: "Cases or pieces?",
    wholeCase: "We sell full cases only",
    check: "Check this",
  } as Record<Issue, string>,
  verified: "Verified",
  looksRight: "Looks right",
  remove: "Remove",
  removed: "Removed",
  undo: "Undo",
  needCheck: (n: number) => (n === 1 ? "1 item needs your check" : `${n} items need your check`),
  allVerified: "All items verified",
  total: "Total incl. GST",
  confirm: "Confirm order",
  confirming: "Placing order…",
  discard: "Discard this message",
  done: "This message is already handled.",
  noReach: "Could not reach the server. Try again.",
  casesShort: (n: number) => `${n} case${n === 1 ? "" : "s"}`,
  saveAlias: (words: string) => `Save “${words}” as this shop's word for it`,
};
type Strings = typeof en;
const hi: Strings = {
  message: "आपका मैसेज",
  photo: "आपकी फ़ोटो देखें",
  voice: "आपका वॉइस नोट सुनें",
  hide: "छुपाएँ",
  aiRead: "AI ने पढ़ा",
  change: "बदलें",
  choose: "सामान चुनें",
  match: (n) => `${n}% मेल`,
  aiMatch: (n) => `AI का सुझाव · ${n}%`,
  learned: "आपका पहचाना शब्द",
  perCase: "/ पेटी",
  stock: (n) => `${n} स्टॉक में`,
  out: "स्टॉक ख़त्म",
  cases: "पेटी",
  pieces: "पीस",
  qty: "मात्रा",
  perCaseConv: (n) => `1 पेटी = ${n} पीस`,
  piecesAs: (pcs, cases) => `${pcs} पीस = ${cases} पेटी`,
  issue: {
    product: "सामान चुनें",
    stock: "स्टॉक ख़त्म। बदलें या हटाएँ",
    qty: "मात्रा लिखें",
    unit: "पेटी या पीस?",
    wholeCase: "हम पूरी पेटी ही बेचते हैं",
    check: "जाँच लें",
  },
  verified: "पक्का",
  looksRight: "सही है",
  remove: "हटाएँ",
  removed: "हटाया गया",
  undo: "वापस लाएँ",
  needCheck: (n) => `${n} सामान जाँचना बाकी`,
  allVerified: "सब सामान पक्का",
  total: "कुल (GST सहित)",
  confirm: "ऑर्डर पक्का करें",
  confirming: "ऑर्डर हो रहा है…",
  discard: "यह मैसेज हटाएँ",
  done: "यह मैसेज पहले ही निपट गया है।",
  noReach: "सर्वर तक नहीं पहुँचे। फिर कोशिश करें।",
  casesShort: (n) => `${n} पेटी`,
  saveAlias: (words) => `“${words}” को इस दुकान का शब्द मानें`,
};
const STRINGS: Record<Lang, Strings> = { en, hi };

function initial(l: Line, catalogue: Map<string, CatalogueItem>): State {
  // The unit comes only from the customer's words; "dabba" or no word leaves it unset.
  const unit: Unit | null = l.unit === "CASE" ? "CASE" : l.unit === "PIECE" ? "PIECE" : null;
  const s: State = { removed: false, productId: l.productId, qty: l.qty, unit, checked: false, substituted: false, saveAlias: true, open: false };
  s.open = issueOf(l, s, catalogue) !== null;
  return s;
}

/** Whole cases for the server, or null if the quantity isn't a whole number of cases. */
function casesOf(st: State, item: CatalogueItem | undefined): number | null {
  if (!st.qty || st.qty < 1 || !st.unit || !item) return null;
  if (st.unit === "CASE") return st.qty;
  return st.qty % item.unitsPerCase === 0 ? st.qty / item.unitsPerCase : null;
}

/** The single most important thing still open on a line, or null when it is verified. */
function issueOf(l: Line, st: State, catalogue: Map<string, CatalogueItem>): Issue | null {
  const item = st.productId ? catalogue.get(st.productId) : undefined;
  if (!item) return "product";
  if (item.stockCases <= 0) return "stock";
  if (!st.qty || st.qty < 1) return "qty";
  if (!st.unit) return "unit";
  if (casesOf(st, item) === null) return "wholeCase";
  const chosenByPerson = st.productId !== l.productId;
  if (!chosenByPerson && confidenceLevel(l.confidence) !== "high" && !st.checked) return "check";
  return null;
}

export function CaptureReview({ lang, role, capture, catalogue }: Props) {
  const s = STRINGS[lang];
  const navigate = useNavigate();
  const byId = useMemo(() => new Map(catalogue.map((c) => [c.id, c])), [catalogue]);
  const [state, setState] = useState<Record<string, State>>(() => Object.fromEntries(capture.lines.map((l) => [l.id, initial(l, byId)])));
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [pending, setPending] = useState(false);

  const update = (id: string, patch: Partial<State>) => setState((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));

  const issues = new Map(capture.lines.map((l) => [l.id, state[l.id]!.removed ? null : issueOf(l, state[l.id]!, byId)]));
  const open = capture.lines.filter((l) => issues.get(l.id) !== null).length;

  const kept = capture.lines.filter((l) => !state[l.id]!.removed && casesOf(state[l.id]!, byId.get(state[l.id]!.productId ?? "")) !== null);
  const priced = useMemo(() => new Map(catalogue.map((c) => [c.id, toPriced(c)])), [catalogue]);
  const quote = priceCart(kept.map((l) => ({ productId: state[l.id]!.productId!, cases: casesOf(state[l.id]!, byId.get(state[l.id]!.productId!))! })), priced, new Date());
  const serverProblems = new Set((result && !result.ok ? result.problems ?? [] : []).map((p) => p.lineId));

  if (capture.status !== "NEEDS_REVIEW") return <p className="py-16 text-center text-[var(--color-muted)]">{s.done}</p>;

  async function confirm() {
    setResult(null);
    setPending(true);
    const lines: ReviewedLineDto[] = capture.lines.map((l) => {
      const st = state[l.id]!;
      return {
        lineId: l.id,
        removed: st.removed,
        productId: st.productId,
        cases: casesOf(st, byId.get(st.productId ?? "")),
        unitConfirmed: st.unit !== null,
        checked: st.checked || issues.get(l.id) === null,
        substituted: st.substituted,
        saveAlias: st.saveAlias,
      };
    });
    try {
      const r = await api.post<ConfirmResult>(`/captures/${capture.id}/confirm`, { lines });
      setResult(r);
      if (r.ok) navigate(role === "DESK" ? `/desk/orders/${r.orderId}?from=capture&learned=${r.learned}` : `/shop/orders/${r.orderId}?placed=1`);
    } catch (e) {
      setResult({ ok: false, message: e instanceof ApiFailure && !e.offline ? e.message : s.noReach });
    } finally {
      setPending(false);
    }
  }

  async function discard() {
    await api.post(`/captures/${capture.id}/discard`).catch(() => {});
    navigate(role === "DESK" ? "/desk" : "/shop/capture");
  }

  const sheetLine = sheetFor ? capture.lines.find((l) => l.id === sheetFor) : undefined;
  const sheetItem = sheetLine ? byId.get(state[sheetLine.id]!.productId ?? "") : undefined;

  return (
    <div>
      <section className="section px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-muted)]">{s.message}{capture.parser !== "rules" && ` · ${s.aiRead}`}</p>
          <button type="button" className="flex h-11 items-center gap-1 text-xs text-[var(--color-muted)]" onClick={() => setShowMessage((v) => !v)} aria-expanded={showMessage}>
            {showMessage ? <ChevronUp size={16} strokeWidth={1.5} /> : <ChevronDown size={16} strokeWidth={1.5} />}
          </button>
        </div>
        <p className={`text-sm whitespace-pre-wrap ${showMessage ? "" : "line-clamp-2"}`}>{capture.rawText}</p>
        {capture.hasMedia && (
          <div className="mt-2">
            <button type="button" className="link text-sm" onClick={() => setShowMedia((v) => !v)}>{showMedia ? s.hide : capture.source === "PHOTO" ? s.photo : s.voice}</button>
            {showMedia && (capture.source === "PHOTO"
              ? <img src={`/api/captures/${capture.id}/media`} alt="" className="fade-in mt-3 max-h-[28rem] w-full rounded-xl object-contain" />
              : <audio src={`/api/captures/${capture.id}/media`} controls preload="metadata" className="fade-in mt-3 w-full" />)}
          </div>
        )}
      </section>

      <p className={`status mt-8 ${open ? "status-warn" : "status-ok"}`}>{open ? s.needCheck(open) : s.allVerified}</p>

      <ol className="mt-2 divide-y divide-[var(--color-line)]">
        {capture.lines.map((l) => (
          <ReviewLine key={l.id} line={l} st={state[l.id]!} issue={issues.get(l.id) ?? null} flagged={serverProblems.has(l.id)}
            canLearn={capture.source === "TEXT"}
            item={byId.get(state[l.id]!.productId ?? "")} s={s} lang={lang}
            onChange={(p) => update(l.id, p)} onChangeProduct={() => setSheetFor(l.id)} />
        ))}
      </ol>

      <button type="button" className="mt-6 text-sm text-[var(--color-muted)] underline underline-offset-4" onClick={discard}>{s.discard}</button>

      <div className={`sticky -mx-5 mt-8 border-t border-[var(--color-line)] bg-white px-5 pt-4 pb-4 ${role === "RETAILER" ? "bottom-16" : "bottom-0"}`}>
        {result && !result.ok && <p role="alert" className="status status-danger mb-3 whitespace-normal">{result.message}</p>}
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm text-[var(--color-muted)]">{s.total}</span>
          <span className="num text-2xl font-semibold">{rupees(quote.totals.totalPaise)}</span>
        </div>
        <button type="button" className="btn btn-primary h-14 w-full" disabled={pending || open > 0 || kept.length === 0 || quote.blocked} onClick={confirm}>
          {pending ? s.confirming : open > 0 ? s.needCheck(open) : s.confirm}
        </button>
      </div>

      {sheetLine && (
        <ProductSheet
          lang={lang}
          catalogue={catalogue}
          currentId={state[sheetLine.id]!.productId}
          suggested={[sheetLine.productId, ...sheetLine.alternatives.map((a) => a.productId)]
            .filter((id, i, all): id is string => !!id && all.indexOf(id) === i)
            .map((id) => byId.get(id))
            .filter((c): c is CatalogueItem => !!c)}
          substitute={sheetItem && sheetItem.stockCases <= 0 ? catalogue.find((c) => c.name === sheetItem.name && c.id !== sheetItem.id && c.stockCases > 0) : undefined}
          onClose={() => setSheetFor(null)}
          onPick={(id, substituted) => {
            update(sheetLine.id, { productId: id, substituted, checked: true });
            setSheetFor(null);
          }}
        />
      )}
    </div>
  );
}

function ReviewLine({ line, st, issue, flagged, canLearn, item, s, lang, onChange, onChangeProduct }: {
  line: Line; st: State; issue: Issue | null; flagged: boolean; canLearn: boolean; item: CatalogueItem | undefined; s: Strings; lang: Lang;
  onChange: (p: Partial<State>) => void; onChangeProduct: () => void;
}) {
  const name = item ? `${lang === "hi" ? item.nameHi : item.name}` : null;

  if (st.removed) {
    return (
      <li className="flex min-h-14 items-center justify-between gap-3 py-3 text-[var(--color-muted)]">
        <span className="text-sm line-through">{line.rawText}</span>
        <button type="button" className="link shrink-0 text-sm" onClick={() => onChange({ removed: false, open: true })}>{s.undo}</button>
      </li>
    );
  }

  const cases = casesOf(st, item);
  // Verified and not being edited: one quiet row. Tap to open it again.
  if (issue === null && !st.open && !flagged) {
    return (
      <li>
        <button type="button" className="flex min-h-16 w-full items-center gap-4 py-3 text-left" onClick={() => onChange({ open: true })}>
          {item && <PackArt code={item.code} kind={item.image} brand={item.brand} label={item.packLabel} size={40} />}
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{name} <span className="font-normal text-[var(--color-muted)]">{item?.packLabel}</span></span>
            <span className="num block text-xs text-[var(--color-muted)]">{cases !== null && s.casesShort(cases)}{st.unit === "PIECE" && ` · ${st.qty} ${s.pieces.toLowerCase()}`}</span>
          </span>
          <span className="status status-ok">{s.verified}</span>
        </button>
      </li>
    );
  }

  const changed = st.productId !== line.productId;
  const caption = changed ? null : line.matchedBy === "alias" ? s.learned : line.matchedBy === "ai" ? s.aiMatch(line.confidence) : line.productId ? s.match(line.confidence) : null;

  return (
    <li className={`py-5 ${flagged ? "bg-[var(--color-section)] -mx-5 px-5" : ""}`}>
      <p className="text-sm text-[var(--color-muted)]">“{line.rawText}”</p>

      <div className="mt-3 flex items-start gap-4">
        {item ? <PackArt code={item.code} kind={item.image} brand={item.brand} label={item.packLabel} size={56} /> : <div className="h-14 w-14 shrink-0 rounded-xl border border-dashed border-[var(--color-line)]" />}
        <div className="min-w-0 flex-1">
          {item ? (
            <>
              <p className="font-semibold leading-snug">{name} <span className="font-normal text-[var(--color-muted)]">{item.packLabel}</span></p>
              <p className="num text-xs text-[var(--color-muted)]">
                {rupees(item.unitPricePaise * item.unitsPerCase)} {s.perCase} + {pct(item.gstRateBp)} GST · {item.stockCases <= 0 ? <span className="text-[var(--color-danger)]">{s.out}</span> : s.stock(item.stockCases)}
              </p>
              {caption && <p className="text-xs text-[var(--color-muted)]">{caption}</p>}
            </>
          ) : (
            <p className="text-[var(--color-muted)]">{s.choose}</p>
          )}
        </div>
        <button type="button" className="link h-11 shrink-0 text-sm" onClick={onChangeProduct}>{item ? s.change : s.choose}</button>
      </div>

      {item && (
        <div className="mt-4 pl-[72px]">
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor={`qty-${line.id}`}>{s.qty}</label>
            <input id={`qty-${line.id}`} inputMode="numeric" placeholder={s.qty}
              className="field num h-11 min-h-0 w-24 text-center font-semibold" value={st.qty ?? ""}
              onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "").slice(0, 4)); onChange({ qty: n > 0 ? n : null }); }} />
            <div className="flex h-11 rounded-xl border border-[var(--color-line)] p-0.5" role="radiogroup" aria-label={`${s.cases} / ${s.pieces}`}>
              {(["CASE", "PIECE"] as const).map((u) => (
                <button key={u} type="button" role="radio" aria-checked={st.unit === u} onClick={() => onChange({ unit: u })}
                  className={`min-w-[4.5rem] rounded-[10px] px-3 text-sm transition-colors ${st.unit === u ? "bg-[var(--color-accent)] font-semibold text-white" : "text-[var(--color-ink)]"}`}>
                  {u === "CASE" ? s.cases : s.pieces}
                </button>
              ))}
            </div>
          </div>
          <p className="num mt-2 text-xs text-[var(--color-muted)]">
            {st.unit === "PIECE" && st.qty && cases !== null ? s.piecesAs(st.qty, cases) : s.perCaseConv(item.unitsPerCase)}
          </p>
        </div>
      )}

      {changed && !st.substituted && canLearn && line.phrase && (
        <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3 pl-[72px] text-sm">
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--color-accent)]" checked={st.saveAlias} onChange={(e) => onChange({ saveAlias: e.target.checked })} />
          <span>{s.saveAlias(line.phrase)}</span>
        </label>
      )}

      <div className="mt-4 flex min-h-12 items-center justify-between gap-3 pl-[72px]">
        {issue ? <span className={`status ${issue === "stock" || issue === "wholeCase" ? "status-danger" : "status-warn"}`}>{s.issue[issue]}</span> : <span className="status status-ok">{s.verified}</span>}
        <div className="flex items-center gap-4">
          {issue === "check" && <button type="button" className="link text-sm" onClick={() => onChange({ checked: true, open: false })}>{s.looksRight}</button>}
          {issue === null && st.open && <button type="button" className="link text-sm" onClick={() => onChange({ open: false })}>{s.hide}</button>}
          <button type="button" className="text-sm text-[var(--color-muted)]" onClick={() => onChange({ removed: true })}>{s.remove}</button>
        </div>
      </div>
    </li>
  );
}

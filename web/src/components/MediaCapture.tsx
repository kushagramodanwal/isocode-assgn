import { useEffect, useRef, useState } from "react";
import { api, ApiFailure } from "../lib/api";
import { compressImage, MAX_RECORDING_SECONDS, toWav16k, uploadType } from "../lib/media";
import type { Lang } from "../../../shared/i18n";

const L = {
  en: {
    or: "or send",
    photo: "Photo of list",
    photoHint: "Hand-written is fine",
    voice: "Voice note",
    voiceHint: "Speak in Hindi or English",
    voiceFile: "Upload a voice note file",
    recording: "Recording… speak your order",
    asking: "Asking for the microphone…",
    stop: "Stop",
    again: "Record again",
    send: "Read this voice note",
    sendPhoto: "Read this photo",
    retake: "Choose another",
    reading: "Reading… usually 3 to 10 seconds",
    micDenied: "Allow the microphone to record a voice note, or type the order.",
    micMissing: "This phone can't record here. Type the order, or send a photo.",
    off: "Photos and voice notes need the AI reader, which is not switched on. Type the order instead.",
    offline: "No signal. Try again when you have signal.",
    pickShop: "Choose the shop first.",
    limit: (s: number) => `Up to ${s} seconds`,
  },
  hi: {
    or: "या भेजें",
    photo: "लिस्ट की फ़ोटो",
    photoHint: "हाथ से लिखी भी चलेगी",
    voice: "वॉइस नोट",
    voiceHint: "हिंदी या अंग्रेज़ी में बोलें",
    voiceFile: "वॉइस नोट फ़ाइल भेजें",
    recording: "रिकॉर्ड हो रहा है… अपना ऑर्डर बोलें",
    asking: "माइक की अनुमति माँग रहे हैं…",
    stop: "रोकें",
    again: "फिर से रिकॉर्ड करें",
    send: "यह वॉइस नोट पढ़ें",
    sendPhoto: "यह फ़ोटो पढ़ें",
    retake: "दूसरी चुनें",
    reading: "पढ़ रहे हैं… 3 से 10 सेकंड",
    micDenied: "वॉइस नोट के लिए माइक की अनुमति दें, या ऑर्डर लिखें।",
    micMissing: "इस फ़ोन पर रिकॉर्डिंग नहीं हो सकती। ऑर्डर लिखें या फ़ोटो भेजें।",
    off: "फ़ोटो और वॉइस नोट के लिए AI रीडर चालू नहीं है। ऑर्डर लिखकर भेजें।",
    offline: "नेटवर्क नहीं है। सिग्नल आने पर फिर कोशिश करें।",
    pickShop: "पहले दुकान चुनें।",
    limit: (s: number) => `${s} सेकंड तक`,
  },
};

type Pending = { blob: Blob; type: string; url: string; kind: "photo" | "voice" };

/**
 * Photo of a handwritten list or a voice note → upload → the same review screen as a typed order.
 * Media is prepared on the phone first so it uploads quickly on 3G.
 */
export function MediaCapture({ lang, enabled, retailerId, allowAudioFile = false, onCreated }: {
  lang: Lang;
  enabled: boolean;
  /** Desk only: which shop the media came from. */
  retailerId?: string | null;
  allowAudioFile?: boolean;
  onCreated: (captureId: string) => void;
}) {
  const s = L[lang];
  const photoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const [recSeconds, setRecSeconds] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsShop = retailerId === null || retailerId === "";

  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.url); }, [pending]);
  useEffect(() => () => recorder.current?.stream.getTracks().forEach((t) => t.stop()), []);

  // Stop automatically at the limit so a forgotten recording can't grow without bound.
  useEffect(() => {
    if (recSeconds === null) return;
    if (recSeconds >= MAX_RECORDING_SECONDS) { recorder.current?.stop(); return; }
    const t = setTimeout(() => setRecSeconds((n) => (n === null ? null : n + 1)), 1000);
    return () => clearTimeout(t);
  }, [recSeconds]);

  if (!enabled) {
    return <p className="text-sm text-[var(--color-muted)]">{s.off}</p>;
  }

  function setMedia(blob: Blob, type: string, kind: Pending["kind"]) {
    setError(null);
    setPending({ blob, type, kind, url: URL.createObjectURL(blob) });
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setMedia(await compressImage(file), "image/jpeg", "photo");
    } catch {
      setMedia(file, uploadType(file), "photo"); // can't decode here (e.g. HEIC): let the server check it
    }
  }

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError(s.micMissing); return; }
    let stream: MediaStream;
    setAsking(true);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(s.micDenied);
      return;
    } finally {
      setAsking(false);
    }
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream);
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecSeconds(null);
      try {
        setMedia(await toWav16k(new Blob(chunks, { type: r.mimeType })), "audio/wav", "voice");
      } catch {
        setError(s.micMissing);
      }
    };
    recorder.current = r;
    r.start();
    setRecSeconds(0);
  }

  async function send() {
    if (!pending) return;
    if (needsShop) { setError(s.pickShop); return; }
    setBusy(true);
    setError(null);
    try {
      const q = retailerId ? `?retailerId=${encodeURIComponent(retailerId)}` : "";
      const { id } = await api.upload<{ id: string }>(`/captures/media${q}`, pending.blob, pending.type);
      onCreated(id);
    } catch (e) {
      setError(e instanceof ApiFailure ? (e.offline ? s.offline : e.message) : String(e));
      setBusy(false);
    }
  }

  return (
    <section aria-label={`${s.photo} / ${s.voice}`} className="space-y-3">
      <p className="text-center text-xs font-medium tracking-wide text-[var(--color-faint)] uppercase">{s.or}</p>

      {recSeconds !== null ? (
        <div className="card flex items-center justify-between gap-3 p-4" role="status">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--color-danger)]" aria-hidden />
            {s.recording} <span className="num text-[var(--color-muted)]">{recSeconds}s / {MAX_RECORDING_SECONDS}s</span>
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => recorder.current?.stop()}>{s.stop}</button>
        </div>
      ) : pending ? (
        <div className="card space-y-3 p-4">
          {pending.kind === "photo" ? (
            <img src={pending.url} alt="" className="max-h-72 w-full rounded-lg object-contain" />
          ) : (
            <audio src={pending.url} controls className="w-full" />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setPending(null)}>{pending.kind === "photo" ? s.retake : s.again}</button>
            <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={send}>{busy ? s.reading : pending.kind === "photo" ? s.sendPhoto : s.send}</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="card flex min-h-24 flex-col items-center justify-center gap-1 p-3 text-center hover:border-[var(--color-accent-fg)]" onClick={() => photoInput.current?.click()}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[var(--color-accent-fg)]" aria-hidden><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            <span className="font-semibold">{s.photo}</span>
            <span className="text-xs text-[var(--color-muted)]">{s.photoHint}</span>
          </button>
          <button type="button" className="card flex min-h-24 flex-col items-center justify-center gap-1 p-3 text-center hover:border-[var(--color-accent-fg)]" disabled={asking} onClick={startRecording}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[var(--color-accent-fg)]" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
            <span className="font-semibold">{s.voice}</span>
            <span className="text-xs text-[var(--color-muted)]">{asking ? s.asking : `${s.voiceHint} · ${s.limit(MAX_RECORDING_SECONDS)}`}</span>
          </button>
        </div>
      )}

      {allowAudioFile && !pending && recSeconds === null && (
        <button type="button" className="w-full text-center text-sm font-medium text-[var(--color-accent-fg)] underline-offset-2 hover:underline" onClick={() => audioInput.current?.click()}>
          {s.voiceFile} (.ogg, .opus, .m4a, .mp3)
        </button>
      )}
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}

      <input ref={photoInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={audioInput} type="file" accept="audio/*,.opus,.ogg,.m4a" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setMedia(f, uploadType(f), "voice"); e.target.value = ""; }} />
    </section>
  );
}

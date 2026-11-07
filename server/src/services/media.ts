/**
 * Photo and voice-note uploads: which types we accept, and checking that the bytes really are
 * what the Content-Type claims (never trust a client-supplied type alone). Pure, so it is unit-tested.
 */
export type MediaKind = "PHOTO" | "VOICE";

export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

/** MIME types Gemini can read, mapped to what they are. */
export const ACCEPTED_MEDIA: Record<string, MediaKind> = {
  "image/jpeg": "PHOTO",
  "image/png": "PHOTO",
  "image/webp": "PHOTO",
  "audio/wav": "VOICE",
  "audio/x-wav": "VOICE",
  "audio/ogg": "VOICE", // WhatsApp voice notes (.opus / .ogg)
  "audio/opus": "VOICE",
  "audio/mpeg": "VOICE",
  "audio/mp4": "VOICE", // Safari recordings, .m4a
  "audio/x-m4a": "VOICE",
  "audio/aac": "VOICE",
};

const ascii = (b: Uint8Array, at: number, s: string) => [...s].every((c, i) => b[at + i] === c.charCodeAt(0));

/** Identify the real format from the file's first bytes. Returns a canonical MIME type or null. */
export function sniffMedia(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(b, 1, "PNG")) return "image/png";
  if (ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) return "image/webp";
  if (ascii(b, 0, "RIFF") && ascii(b, 8, "WAVE")) return "audio/wav";
  if (ascii(b, 0, "OggS")) return "audio/ogg";
  if (ascii(b, 0, "ID3") || (b[0] === 0xff && (b[1]! & 0xe0) === 0xe0 && (b[1]! & 0x06) !== 0)) return b[1] === 0xf1 || b[1] === 0xf9 ? "audio/aac" : "audio/mpeg";
  if (ascii(b, 4, "ftyp")) return "audio/mp4";
  return null;
}

/** Canonical name for equivalent declared types, so "audio/x-wav" and "audio/wav" compare equal. */
function canonical(mime: string): string {
  const m = mime.split(";")[0]!.trim().toLowerCase();
  return ({ "audio/x-wav": "audio/wav", "audio/opus": "audio/ogg", "audio/x-m4a": "audio/mp4" } as Record<string, string>)[m] ?? m;
}

export type MediaCheck = { ok: true; mimeType: string; kind: MediaKind } | { ok: false; reason: string };

export function checkMedia(declaredType: string | undefined, bytes: Uint8Array): MediaCheck {
  if (!bytes.length) return { ok: false, reason: "The file is empty." };
  if (bytes.length > MAX_MEDIA_BYTES) return { ok: false, reason: "The file is too large (8 MB at most)." };
  const declared = canonical(declaredType ?? "");
  if (!ACCEPTED_MEDIA[declared]) return { ok: false, reason: "Send a photo (JPEG, PNG, WebP) or a voice note (OGG, WAV, MP3, M4A, AAC)." };
  const real = sniffMedia(bytes);
  if (!real) return { ok: false, reason: "This file is not a photo or voice note we can read." };
  // AAC/MP3 frames and MP4 containers overlap in practice; only require the same family for audio.
  const sameFamily = real.split("/")[0] === declared.split("/")[0];
  if (real !== declared && !(sameFamily && real.startsWith("audio/"))) {
    return { ok: false, reason: "The file's contents don't match its type." };
  }
  return { ok: true, mimeType: real, kind: ACCEPTED_MEDIA[real]! };
}

/**
 * Browser-side media prep for slow connections.
 * - Photos are scaled to 1600 px and re-encoded as JPEG (a 4 MB camera photo becomes ~250 kB).
 * - Recordings are converted to 16 kHz mono WAV: every browser records in a different format
 *   (Chrome WebM, Safari MP4) and WAV is one Gemini always reads. 60 s ≈ 1.9 MB.
 */
export const MAX_RECORDING_SECONDS = 90;

export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Could not prepare the photo");
  return blob;
}

export async function toWav16k(recording: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await recording.arrayBuffer());
  await ctx.close();
  const rate = 16_000;
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const pcm = (await offline.startRendering()).getChannelData(0);

  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buffer);
  const str = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]!));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Map a picked file to the type the server checks; WhatsApp ".opus" files often arrive untyped. */
export function uploadType(file: File): string {
  if (file.type) return file.type.split(";")[0]!;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ({ opus: "audio/ogg", ogg: "audio/ogg", m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<string, string>)[ext ?? ""] ?? "application/octet-stream";
}

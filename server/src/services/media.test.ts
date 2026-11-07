import { describe, expect, it } from "vitest";
import { checkMedia, MAX_MEDIA_BYTES, sniffMedia } from "./media";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)).concat(new Array(16).fill(0)));

const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0]);
const PNG = bytes([0x89], "PNG", [0x0d, 0x0a]);
const WAV = bytes("RIFF", [0, 0, 0, 0], "WAVE");
const OGG = bytes("OggS");
const M4A = bytes([0, 0, 0, 0x20], "ftypM4A ");
const HTML = bytes("<!doctype html><script>");

describe("sniffMedia", () => {
  it.each([[JPEG, "image/jpeg"], [PNG, "image/png"], [WAV, "audio/wav"], [OGG, "audio/ogg"], [M4A, "audio/mp4"], [HTML, null]])("%#", (b, want) => {
    expect(sniffMedia(b)).toBe(want);
  });
});

describe("checkMedia", () => {
  it("accepts a photo and a WhatsApp voice note", () => {
    expect(checkMedia("image/jpeg", JPEG)).toMatchObject({ ok: true, kind: "PHOTO" });
    expect(checkMedia("audio/ogg", OGG)).toMatchObject({ ok: true, kind: "VOICE" });
    expect(checkMedia("audio/opus", OGG)).toMatchObject({ ok: true, kind: "VOICE", mimeType: "audio/ogg" });
    expect(checkMedia("audio/webm;codecs=opus", OGG).ok).toBe(false); // not on the list
  });

  it("refuses a file whose contents don't match its type (an HTML page sent as a JPEG)", () => {
    expect(checkMedia("image/jpeg", HTML)).toMatchObject({ ok: false });
    expect(checkMedia("image/png", JPEG)).toMatchObject({ ok: false });
    expect(checkMedia("audio/wav", JPEG)).toMatchObject({ ok: false });
  });

  it("refuses empty, oversized and unlisted files", () => {
    expect(checkMedia("image/jpeg", new Uint8Array()).ok).toBe(false);
    expect(checkMedia("image/jpeg", new Uint8Array(MAX_MEDIA_BYTES + 1)).ok).toBe(false);
    expect(checkMedia("application/pdf", bytes("%PDF")).ok).toBe(false);
    expect(checkMedia(undefined, JPEG).ok).toBe(false);
  });
});

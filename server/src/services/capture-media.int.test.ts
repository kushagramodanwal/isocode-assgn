/**
 * Photo / voice capture against Postgres, with Gemini mocked: the transcript is fixed so we can
 * check what the app does with it (caps, [unclear], storage, access), not what Gemini hears.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const run = !!process.env.TEST_DATABASE_URL;

vi.mock("./transcribe", () => ({
  MediaUnreadable: class extends Error {},
  transcribeMedia: vi.fn(async () => ["5 peti biscuit chhota", "2 peti washing powder 1 kilo", "[unclear] 3 peti"]),
}));
vi.mock("./llm", () => ({ extractWithLlm: vi.fn(async () => { throw new Error("not in tests"); }) }));
vi.mock("../env", async (orig) => {
  const real = (await orig()) as { env: Record<string, unknown> };
  return { env: { ...real.env, llmEnabled: true, llmModel: "gemini-test" } };
});

const { db } = run ? await import("../db") : ({} as typeof import("../db"));
const { createMediaCapture, confirmCapture, MEDIA_CONFIDENCE_CAP, UNCLEAR_CONFIDENCE_CAP } = run ? await import("./capture") : ({} as typeof import("./capture"));

afterAll(async () => { if (run) await db.$disconnect(); });

const phone = (d: string) => d + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(32).fill(1)]);

describe.skipIf(!run)("photo and voice capture (Gemini mocked)", () => {
  it("stores the photo, keeps the transcript as the message, and never auto-accepts a line", async () => {
    const tag = randomUUID().slice(0, 8);
    const retailer = await db.retailer.create({ data: { code: `M-${tag}`, shopName: `Media ${tag}`, ownerName: "T", area: "A", route: "R", phone: phone("9"), creditLimitPaise: 10_000_000, outstandingPaise: 0, outstandingAsOf: new Date() } });
    const user = await db.user.create({ data: { phone: phone("8"), name: "R", role: "RETAILER", retailerId: retailer.id } });

    const id = await createMediaCapture({ actorId: user.id, retailerId: retailer.id, channel: "APP_TEXT", media: { kind: "PHOTO", mimeType: "image/jpeg", bytes: JPEG } });
    const capture = await db.capture.findUniqueOrThrow({ where: { id }, include: { lines: { orderBy: { position: "asc" } }, media: true } });

    expect(capture.source).toBe("PHOTO");
    expect(capture.rawText).toBe("5 peti biscuit chhota\n2 peti washing powder 1 kilo\n[unclear] 3 peti");
    expect(capture.parserNote).toMatch(/check each line against the photo/);
    expect(capture.media?.mimeType).toBe("image/jpeg");
    expect(capture.media?.sizeBytes).toBe(JPEG.length);
    expect(capture.lines).toHaveLength(3);
    // Every line needs a person's tick, even one the matcher is sure about.
    for (const l of capture.lines) expect(l.confidence).toBeLessThanOrEqual(MEDIA_CONFIDENCE_CAP);
    // The line the transcriber couldn't read is low and has no product words to lean on.
    expect(capture.lines[2]!.confidence).toBeLessThanOrEqual(UNCLEAR_CONFIDENCE_CAP);
    expect(capture.lines[2]!.qty).toBe(3);

    // Correcting a transcribed line must not teach the shop's "words": they came from the AI.
    const brand = await db.brand.create({ data: { name: `Brand ${tag}` } });
    const salt = await db.product.create({
      data: { code: `SALT-${tag}`, name: "Iodised salt", nameHi: "नमक", brandId: brand.id, category: "food", packLabel: "1 kg", unitsPerCase: 25, unitPricePaise: 1850, gstRateBp: 0, stockCases: 50, image: "pouch", keywords: ["namak"] },
    });
    const r = await confirmCapture({
      actorId: user.id, captureId: id, retailerScope: retailer.id,
      lines: capture.lines.map((l, i) => ({ lineId: l.id, removed: i !== 0, productId: salt.id, cases: 5, unitConfirmed: true, checked: true, substituted: false })),
    });
    expect(r.ok).toBe(true);
    expect(await db.retailerAlias.count({ where: { retailerId: retailer.id } })).toBe(0);
  });
});

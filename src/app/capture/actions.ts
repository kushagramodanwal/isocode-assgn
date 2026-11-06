"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { actor } from "@/lib/auth";
import { db } from "@/lib/db";
import { confirmCapture, createCapture, discardCapture, MAX_MESSAGE_CHARS, type ConfirmProblem } from "@/server/capture";
import { MAX_CASES_PER_LINE } from "@/domain/pricing";

const Text = z.string().trim().min(3, "Write at least one item").max(MAX_MESSAGE_CHARS, `Keep it under ${MAX_MESSAGE_CHARS} characters`);

export type CreateState = { error?: string; text?: string };

/** Retailer types their own order. */
export async function createOwnCapture(_prev: CreateState, form: FormData): Promise<CreateState> {
  const user = await actor("RETAILER");
  const text = Text.safeParse(form.get("text"));
  if (!text.success || !user.retailerId) return { error: text.error?.issues[0]?.message ?? "Invalid", text: String(form.get("text") ?? "") };
  const id = await createCapture({ actorId: user.id, retailerId: user.retailerId, text: text.data, channel: "APP_TEXT" });
  redirect(`/shop/capture/${id}`);
}

/** Desk pastes a WhatsApp message for a chosen retailer. */
export async function createDeskCapture(_prev: CreateState, form: FormData): Promise<CreateState> {
  const user = await actor("DESK");
  const text = Text.safeParse(form.get("text"));
  const retailerId = z.string().min(1).safeParse(form.get("retailerId"));
  if (!retailerId.success) return { error: "Choose the shop that sent this message", text: String(form.get("text") ?? "") };
  if (!text.success) return { error: text.error.issues[0]?.message, text: String(form.get("text") ?? "") };
  const exists = await db.retailer.findUnique({ where: { id: retailerId.data }, select: { id: true } });
  if (!exists) return { error: "Unknown shop", text: text.data };
  const id = await createCapture({ actorId: user.id, retailerId: retailerId.data, text: text.data, channel: "WHATSAPP_TEXT" });
  redirect(`/desk/capture/${id}`);
}

const Reviewed = z.object({
  captureId: z.string().min(1),
  lines: z.array(z.object({
    lineId: z.string().min(1),
    removed: z.boolean(),
    productId: z.string().min(1).nullable(),
    cases: z.number().int().min(1).max(MAX_CASES_PER_LINE).nullable(),
    unitConfirmed: z.boolean(),
    checked: z.boolean(),
    substituted: z.boolean(),
  })).max(40),
});

export type ConfirmState =
  | { ok: true; href: string; learned: number }
  | { ok: false; message: string; problems?: ConfirmProblem[] };

export async function confirmCaptureAction(input: unknown): Promise<ConfirmState> {
  const user = await actor();
  const parsed = Reviewed.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Some quantities are not valid whole numbers of cases." };
  const scope = user.role === "DESK" ? null : user.retailerId;
  if (user.role !== "DESK" && !scope) return { ok: false, message: "Not allowed" };
  try {
    const r = await confirmCapture({ actorId: user.id, captureId: parsed.data.captureId, retailerScope: scope, lines: parsed.data.lines });
    if (r.ok) {
      revalidatePath("/desk", "layout");
      revalidatePath("/shop", "layout");
      const href = user.role === "DESK" ? `/desk/orders/${r.order.orderId}?from=capture&learned=${r.learned}` : `/shop/orders/${r.order.orderId}?placed=1`;
      return { ok: true, href, learned: r.learned };
    }
    switch (r.reason) {
      case "not_found": return { ok: false, message: "This message was not found." };
      case "already_done": return { ok: false, message: "Someone already confirmed or discarded this message. Reload to see it." };
      case "nothing_to_order": return { ok: false, message: "Every line is removed. Discard the message instead." };
      case "problems": return { ok: false, message: "Some lines still need an answer.", problems: r.problems };
      case "order":
        return { ok: false, message: r.result.reason === "blocked" ? "A line is out of stock or above stock. Substitute or remove it." : "Stock or prices changed. Reload and check again." };
    }
  } catch (e) {
    console.error("[confirmCapture]", e);
    return { ok: false, message: "Could not save. Check your connection and try again." };
  }
}

export async function discardCaptureAction(captureId: string) {
  const user = await actor();
  const scope = user.role === "DESK" ? null : user.retailerId;
  await discardCapture(captureId, user.id, scope);
  revalidatePath("/desk", "layout");
  redirect(user.role === "DESK" ? "/desk" : "/shop/capture");
}

"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actor } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderStateError, rejectOrder, releaseHold } from "@/server/orders";

export type ActionResult = { ok: boolean; message?: string };

export async function releaseHoldAction(orderId: string): Promise<ActionResult> {
  const user = await actor("DESK");
  try {
    await releaseHold(z.string().min(1).parse(orderId), user.id);
  } catch (e) {
    return { ok: false, message: e instanceof OrderStateError ? e.message : "Could not release the hold." };
  }
  revalidatePath("/desk", "layout");
  return { ok: true };
}

const Reject = z.object({ orderId: z.string().min(1), reason: z.string().trim().min(3, "Give a short reason").max(200) });

export async function rejectAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await actor("DESK");
  const parsed = Reject.safeParse({ orderId: form.get("orderId"), reason: form.get("reason") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  try {
    await rejectOrder(parsed.data.orderId, user.id, parsed.data.reason);
  } catch (e) {
    return { ok: false, message: e instanceof OrderStateError ? e.message : "Could not reject the order." };
  }
  revalidatePath("/desk", "layout");
  return { ok: true };
}

/**
 * Moves the chosen CONFIRMED orders into a new export batch. Guarded by status in the
 * update itself, so two people exporting at once can't put an order in two batches.
 */
export async function exportAction(form: FormData) {
  const user = await actor("DESK");
  const ids = z.array(z.string().min(1)).min(1).max(500).safeParse(form.getAll("orderId"));
  if (!ids.success) redirect("/desk/export?error=none");
  const batchId = await db.$transaction(async (tx) => {
    const batch = await tx.exportBatch.create({ data: { createdById: user.id } });
    const moved = await tx.order.updateMany({ where: { id: { in: ids.data }, status: "CONFIRMED" }, data: { status: "EXPORTED", exportBatchId: batch.id } });
    if (moved.count === 0) throw new Error("nothing");
    await tx.auditLog.create({ data: { actorId: user.id, action: "export.created", entityId: batch.id, data: { orders: moved.count } } });
    return batch.id;
  }).catch(() => null);
  revalidatePath("/desk", "layout");
  redirect(batchId ? `/desk/export?batch=${batchId}` : "/desk/export?error=stale");
}

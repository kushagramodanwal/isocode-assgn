import type { Metadata } from "next";
import { requireDesk } from "@/lib/auth";
import { db } from "@/lib/db";
import { NewCaptureForm } from "./NewCaptureForm";

export const metadata: Metadata = { title: "Paste a message" };

export default async function NewCapturePage() {
  await requireDesk();
  const retailers = await db.retailer.findMany({ orderBy: { shopName: "asc" }, select: { id: true, shopName: true, area: true, phone: true, code: true } });
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-bold">Paste a WhatsApp order</h1>
      <p className="mb-4 text-sm text-[var(--color-muted)]">Text messages only for now. The reader drafts the lines; nothing is ordered until you confirm.</p>
      <NewCaptureForm retailers={retailers} />
    </div>
  );
}

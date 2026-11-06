import type { OrderStatus } from "@prisma/client";
import { dict, type Lang } from "@/lib/i18n";

const tone: Record<OrderStatus, string> = {
  CONFIRMED: "pill-accent",
  CREDIT_HOLD: "pill-warn",
  EXPORTED: "pill-muted",
  REJECTED: "pill-danger",
};

export function StatusPill({ status, lang = "en" }: { status: OrderStatus; lang?: Lang }) {
  const label = lang === "en" && status === "EXPORTED" ? "Exported to Tally" : dict[lang].status[status];
  return <span className={`pill ${tone[status]}`}>{label}</span>;
}

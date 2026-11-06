import type { Prisma } from "@prisma/client";
import { db } from "../db";

export type CreditStatus = {
  limitPaise: number;
  outstandingPaise: number;
  openOrdersPaise: number;
  availablePaise: number;
  outstandingAsOf: Date;
};

/**
 * Accepted orders since the Tally outstanding snapshot count against the limit (assumption A-09).
 * Orders on credit hold do not: they are not accepted yet.
 */
export async function creditStatus(retailerId: string, tx: Prisma.TransactionClient = db): Promise<CreditStatus> {
  const r = await tx.retailer.findUniqueOrThrow({ where: { id: retailerId } });
  const open = await tx.order.aggregate({
    where: { retailerId, status: { in: ["CONFIRMED", "EXPORTED"] }, createdAt: { gt: r.outstandingAsOf } },
    _sum: { totalPaise: true },
  });
  const openOrdersPaise = open._sum.totalPaise ?? 0;
  return {
    limitPaise: r.creditLimitPaise,
    outstandingPaise: r.outstandingPaise,
    openOrdersPaise,
    availablePaise: r.creditLimitPaise - r.outstandingPaise - openOrdersPaise,
    outstandingAsOf: r.outstandingAsOf,
  };
}

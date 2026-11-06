import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { SESSION_COOKIE, signSession, verifySession } from "./session-token";
import type { Role } from "@prisma/client";

const MAX_AGE = { RETAILER: 60 * 60 * 24 * 30, DESK: 60 * 60 * 12 } as const;

export async function startSession(user: { id: string; role: Role; retailerId: string | null }) {
  const maxAge = MAX_AGE[user.role];
  const token = await signSession({ uid: user.id, role: user.role, rid: user.retailerId }, maxAge);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user, re-read from the database so a deactivated user loses access at once. */
export const currentUser = cache(async () => {
  const claims = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const user = await db.user.findUnique({ where: { id: claims.uid }, include: { retailer: true } });
  if (!user || !user.active || user.role !== claims.role) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
export type RetailerUser = CurrentUser & { retailerId: string; retailer: NonNullable<CurrentUser["retailer"]> };

export async function requireRetailer(): Promise<RetailerUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.role !== "RETAILER" || !u.retailerId || !u.retailer) redirect("/desk");
  return u as RetailerUser;
}

export async function requireDesk(): Promise<CurrentUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.role !== "DESK") redirect("/shop");
  return u;
}

/** For server actions: never redirect, just refuse. */
export class Forbidden extends Error {}

export async function actor(role?: Role): Promise<CurrentUser> {
  const u = await currentUser();
  if (!u || (role && u.role !== role)) throw new Forbidden("Not allowed");
  return u;
}

/** Retailers act only on their own account; the desk may act on any. */
export function canActForRetailer(u: CurrentUser, retailerId: string): boolean {
  return u.role === "DESK" || u.retailerId === retailerId;
}

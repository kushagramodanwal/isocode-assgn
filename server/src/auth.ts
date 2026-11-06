import type { NextFunction, Request, Response } from "express";
import type { Prisma, Role } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { SESSION_COOKIE, signSession, verifySession } from "./session-token";
import { HttpError } from "./http";

export type AuthUser = Prisma.UserGetPayload<{ include: { retailer: true } }>;

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

const MAX_AGE = { RETAILER: 60 * 60 * 24 * 30, DESK: 60 * 60 * 12 } as const;

export async function startSession(res: Response, user: { id: string; role: Role; retailerId: string | null }) {
  const maxAge = MAX_AGE[user.role];
  const token = await signSession({ uid: user.id, role: user.role, rid: user.retailerId }, maxAge);
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/", maxAge: maxAge * 1000 });
}

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

/**
 * Reads the session cookie and re-loads the user from the database on every request,
 * so a deactivated user or a changed role takes effect immediately.
 */
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const claims = await verifySession(req.cookies?.[SESSION_COOKIE]);
    if (claims) {
      const user = await db.user.findUnique({ where: { id: claims.uid }, include: { retailer: true } });
      if (user && user.active && user.role === claims.role) req.user = user;
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(role?: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "unauthenticated", "Please sign in"));
    if (role && req.user.role !== role) return next(new HttpError(403, "forbidden", "Not allowed"));
    if (req.user.role === "RETAILER" && !req.user.retailerId) return next(new HttpError(403, "forbidden", "No shop linked to this account"));
    next();
  };
}

/** Narrow helpers for handlers that sit behind requireRole. */
export function user(req: Request): AuthUser {
  if (!req.user) throw new HttpError(401, "unauthenticated", "Please sign in");
  return req.user;
}

export function retailerId(req: Request): string {
  const u = user(req);
  if (!u.retailerId) throw new HttpError(403, "forbidden", "No shop linked to this account");
  return u.retailerId;
}

/** Retailers act only on their own shop; the desk on any. */
export function scope(req: Request): string | null {
  const u = user(req);
  return u.role === "DESK" ? null : retailerId(req);
}

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

/**
 * First line of access control: route prefixes by role. Every page and server action
 * checks again on the server against the database (lib/auth.ts), so this is not the only gate.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const claims = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const home = (role: string) => new URL(role === "DESK" ? "/desk" : "/shop", req.url);

  if (pathname === "/") return NextResponse.redirect(claims ? home(claims.role) : new URL("/login", req.url));
  // /login decides for itself (it checks the database), so a token for a deleted or
  // deactivated user can't cause a redirect loop.
  if (pathname.startsWith("/login")) return NextResponse.next();
  if (!claims) return NextResponse.redirect(new URL("/login", req.url));
  if (pathname.startsWith("/shop") && claims.role !== "RETAILER") return NextResponse.redirect(home(claims.role));
  if ((pathname.startsWith("/desk") || pathname.startsWith("/api/export")) && claims.role !== "DESK") {
    return pathname.startsWith("/api/") ? new NextResponse("Forbidden", { status: 403 }) : NextResponse.redirect(home(claims.role));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/login", "/shop/:path*", "/desk/:path*", "/api/export/:path*"] };

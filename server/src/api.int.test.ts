/**
 * HTTP-level checks of access control and request guards, against TEST_DATABASE_URL.
 * Sessions are minted directly so each test controls exactly who is calling.
 */
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";

const run = !!process.env.TEST_DATABASE_URL;
const { createApp } = run ? await import("./app") : ({} as typeof import("./app"));
const { db } = run ? await import("./db") : ({} as typeof import("./db"));
const { signSession, SESSION_COOKIE } = run ? await import("./session-token") : ({} as typeof import("./session-token"));

const app = run ? createApp() : null!;
afterAll(async () => { if (run) await db.$disconnect(); });

let n = 0;
const phone = () => `7${String(Date.now()).slice(-6)}${String(n++).padStart(3, "0")}`;

async function shopWithUser() {
  const tag = randomUUID().slice(0, 8);
  const retailer = await db.retailer.create({ data: { code: `API-${tag}`, shopName: `API Shop ${tag}`, ownerName: "T", area: "A", route: "R", phone: phone(), creditLimitPaise: 100_000_00, outstandingPaise: 0, outstandingAsOf: new Date() } });
  const user = await db.user.create({ data: { phone: phone(), name: "Retailer", role: "RETAILER", retailerId: retailer.id } });
  const order = await db.order.create({ data: { retailerId: retailer.id, placedById: user.id, source: "APP", status: "CONFIRMED", grossPaise: 100, discountPaise: 0, taxablePaise: 100, gstPaise: 5, totalPaise: 105, idempotencyKey: randomUUID() } });
  return { retailer, user, order };
}

async function cookieFor(u: { id: string; role: "RETAILER" | "DESK"; retailerId: string | null }) {
  return `${SESSION_COOKIE}=${await signSession({ uid: u.id, role: u.role, rid: u.retailerId }, 3600)}`;
}

describe.skipIf(!run)("API access control", () => {
  it("requires a session", async () => {
    expect((await request(app).get("/api/shop/catalogue")).status).toBe(401);
    expect((await request(app).get("/api/desk/summary")).status).toBe(401);
  });

  it("keeps retailers out of desk endpoints and exports", async () => {
    const a = await shopWithUser();
    const c = await cookieFor(a.user);
    expect((await request(app).get("/api/desk/summary").set("Cookie", c)).status).toBe(403);
    expect((await request(app).get("/api/desk/export/anything").set("Cookie", c)).status).toBe(403);
  });

  it("a retailer cannot read another shop's order (404, not 403, so ids don't leak)", async () => {
    const a = await shopWithUser();
    const b = await shopWithUser();
    const c = await cookieFor(a.user);
    expect((await request(app).get(`/api/shop/orders/${a.order.id}`).set("Cookie", c)).status).toBe(200);
    expect((await request(app).get(`/api/shop/orders/${b.order.id}`).set("Cookie", c)).status).toBe(404);
  });

  it("a deactivated user is locked out at once, even with a valid token", async () => {
    const a = await shopWithUser();
    const c = await cookieFor(a.user);
    await db.user.update({ where: { id: a.user.id }, data: { active: false } });
    expect((await request(app).get("/api/me").set("Cookie", c)).body).toBeNull();
    expect((await request(app).get("/api/shop/credit").set("Cookie", c)).status).toBe(401);
  });

  it("a tampered token is rejected", async () => {
    const a = await shopWithUser();
    const c = (await cookieFor(a.user)).slice(0, -3) + "abc";
    expect((await request(app).get("/api/me").set("Cookie", c)).body).toBeNull();
    expect((await request(app).get("/api/shop/orders").set("Cookie", c)).status).toBe(401);
  });

  it("the desk sees any shop's order", async () => {
    const a = await shopWithUser();
    const desk = await db.user.create({ data: { phone: phone(), name: "Desk", role: "DESK" } });
    const res = await request(app).get(`/api/desk/orders/${a.order.id}`).set("Cookie", await cookieFor(desk));
    expect(res.status).toBe(200);
    expect(res.body.order.retailer.shopName).toBe(a.retailer.shopName);
  });
});

describe.skipIf(!run)("API request guards", () => {
  it("refuses writes from another origin", async () => {
    const res = await request(app).post("/api/auth/otp").set("Origin", "https://evil.example").send({ phone: "9000000001" });
    expect(res.status).toBe(403);
  });

  it("refuses non-JSON writes (blocks simple cross-site form posts)", async () => {
    const res = await request(app).post("/api/auth/otp").type("form").send("phone=9000000001");
    expect(res.status).toBe(415);
  });

  it("validates input with a clear message", async () => {
    const res = await request(app).post("/api/auth/otp").send({ phone: "12345" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Enter a 10-digit mobile number");
  });

  it("rejects bad order quantities before touching the database", async () => {
    const a = await shopWithUser();
    const res = await request(app).post("/api/shop/orders").set("Cookie", await cookieFor(a.user))
      .send({ items: [{ productId: "x", cases: 1.5 }], idempotencyKey: randomUUID(), expectedTotalPaise: 0 });
    expect(res.status).toBe(400);
  });

  it("does not reveal whether a phone number is registered", async () => {
    const unknown = await request(app).post("/api/auth/otp").send({ phone: "6999999999" });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual({ ok: true });
  });
});

import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import path from "node:path";
import { existsSync } from "node:fs";
import { env } from "./env";
import { loadUser } from "./auth";
import { errorHandler, HttpError } from "./http";
import { authRouter } from "./routes/auth";
import { shopRouter } from "./routes/shop";
import { captureRouter } from "./routes/captures";
import { deskRouter } from "./routes/desk";

/**
 * Cookie sessions + SameSite=Lax already stop most cross-site writes. On top, every
 * state-changing API call must come from an allowed Origin and carry JSON.
 */
function csrfGuard(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const sameHost = origin && new URL(origin).host === req.get("host");
  if (origin && !sameHost && !env.allowedOrigins.includes(origin)) return next(new HttpError(403, "bad_origin", "Request origin not allowed"));
  // JSON everywhere, except the one upload endpoint, which takes a photo or voice note as-is.
  const isUpload = req.path === "/captures/media" && !!req.is(["image/*", "audio/*"]);
  if (!req.is("application/json") && !isUpload) return next(new HttpError(415, "json_required", "Send JSON"));
  next();
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          mediaSrc: ["'self'", "blob:"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression()); // 349 kB of JS becomes ~110 kB on the wire: matters on 3G
  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());

  const api = express.Router();
  api.use(csrfGuard);
  api.use(loadUser);
  api.get("/health", (_req, res) => { res.json({ ok: true }); });
  api.use(authRouter);
  api.use("/shop", shopRouter);
  api.use("/captures", captureRouter);
  api.use("/desk", deskRouter);
  api.use((_req, _res, next) => next(new HttpError(404, "not_found", "No such endpoint")));
  api.use(errorHandler);
  app.use("/api", api);

  // In production the same process serves the built React app.
  const webDist = path.resolve(process.cwd(), "dist/web");
  if (existsSync(webDist)) {
    app.use(express.static(webDist, { index: false, maxAge: "1y", immutable: true, setHeaders: (res, file) => {
      if (/(sw\.js|manifest\.webmanifest|\.html)$/.test(file)) res.setHeader("Cache-Control", "no-cache");
      // Fonts keep stable versioned names (so index.html can preload them): long cache, but not "immutable".
      else if (/\/(fonts|products)\//.test(file)) res.setHeader("Cache-Control", "public, max-age=31536000");
    } }));
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(webDist, "index.html"));
    });
  }
  return app;
}

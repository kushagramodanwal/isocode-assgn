import { z } from "zod";
import { existsSync } from "node:fs";

// Local development reads .env; in production the platform provides real environment variables.
if (process.env.NODE_ENV !== "production" && existsSync(".env")) process.loadEnvFile(".env");

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  DEMO_MODE: z.enum(["true", "false"]).default("false"),
  LLM_PROVIDER: z.enum(["anthropic", "none"]).default("none"),
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  // Public origin(s) of the web app, comma separated. Mutating requests from other origins are refused.
  APP_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z.string().default("development"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  demoMode: parsed.data.DEMO_MODE === "true",
  llmEnabled: parsed.data.LLM_PROVIDER === "anthropic" && !!parsed.data.ANTHROPIC_API_KEY,
  llmModel: parsed.data.LLM_MODEL || "claude-opus-5-5",
  allowedOrigins: parsed.data.APP_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean),
};

import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  DEMO_MODE: z.enum(["true", "false"]).default("false"),
  LLM_PROVIDER: z.enum(["anthropic", "none"]).default("none"),
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  NODE_ENV: z.string().default("development"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
}

export const env = {
  ...parsed.data,
  demoMode: parsed.data.DEMO_MODE === "true",
  llmEnabled: parsed.data.LLM_PROVIDER === "anthropic" && !!parsed.data.ANTHROPIC_API_KEY,
  llmModel: parsed.data.LLM_MODEL || "claude-opus-5-5",
};

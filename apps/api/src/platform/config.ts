import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from workspace root or current dir
dotenv.config();
try {
  const rootEnvPath = path.resolve(process.cwd(), '../../.env');
  dotenv.config({ path: rootEnvPath });
} catch {
  // ignore
}

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/retailer_db'),
  SESSION_SECRET: z.string().default('super-secret-fmcg-retailer-session-key-32chars-min'),
  DEV_OTP_ENABLED: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === 'true')
    .default(true),
  DEMO_OTP_CODE: z.string().default('123456'),
  COOKIE_SECURE: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === 'true')
    .default(false),
  MESSAGING_PROVIDER: z.enum(['mock', 'twilio', 'gupshup']).default('mock'),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).default('mock'),
  LLM_PROVIDER: z.enum(['mock', 'gemini', 'openai']).default('mock'),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(overrideEnv?: Record<string, any>): Config {
  const env = overrideEnv || process.env;
  const parsed = ConfigSchema.parse(env);

  // Startup Guard (Spec Section 8 & 11):
  // The app refuses to start if NODE_ENV=production and DEV_OTP_ENABLED=true together.
  if (parsed.NODE_ENV === 'production' && parsed.DEV_OTP_ENABLED) {
    throw new Error('SECURITY VIOLATION: DEV_OTP_ENABLED cannot be true in production');
  }

  return parsed;
}

export const config = loadConfig();

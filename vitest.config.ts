import { defineConfig } from "vitest/config";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";

// Local runs read TEST_DATABASE_URL from .env; CI sets it in the environment.
if (!process.env.TEST_DATABASE_URL && existsSync(".env")) loadEnvFile(".env");

export default defineConfig({
  test: {
    include: ["shared/**/*.test.ts", "server/**/*.test.ts"],
    environment: "node",
    setupFiles: ["server/src/test/setup.ts"],
    fileParallelism: false,
  },
});

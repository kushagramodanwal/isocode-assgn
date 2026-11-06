import { defineConfig } from "vitest/config";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";

// Local runs read TEST_DATABASE_URL from .env; CI sets it in the environment.
if (!process.env.TEST_DATABASE_URL && existsSync(".env")) loadEnvFile(".env");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "src/test/empty.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
    fileParallelism: false,
  },
});

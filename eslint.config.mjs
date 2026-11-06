import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

const config = tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "web/public/sw.js", "docs/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["server/**/*.ts", "prisma/**/*.ts", "scripts/**/*.mjs", "*.ts", "*.mjs"], languageOptions: { globals: globals.node } },
  { files: ["web/**/*.{ts,tsx}"], languageOptions: { globals: globals.browser }, plugins: { "react-hooks": reactHooks }, rules: reactHooks.configs.recommended.rules },
);

export default config;

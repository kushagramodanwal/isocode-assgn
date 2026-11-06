import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API_PORT = Number(process.env.PORT ?? 4000);

export default defineConfig({
  root: "web",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the SPA and API are separate processes; the proxy keeps them same-origin.
    proxy: { "/api": { target: `http://localhost:${API_PORT}`, changeOrigin: false } },
  },
  build: { outDir: "../dist/web", emptyOutDir: true, sourcemap: false, target: "es2020" },
});

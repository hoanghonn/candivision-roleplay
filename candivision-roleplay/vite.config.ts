/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The agents live in apps/server. Start it with `npm run dev:server` from the repo root.
const proxy = {
  "/api": "http://localhost:8787",
  "/ws": { target: "ws://localhost:8787", ws: true },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
  test: { environment: "jsdom", include: ["src/**/*.test.ts"] },
});

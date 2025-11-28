import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],

  // ──────────────────────────────────────────────
  // DEV MODE: unchanged — works exactly as today
  // ──────────────────────────────────────────────
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },

  // ──────────────────────────────────────────────
  // BUILD MODE: create manifest + stable filenames
  // ──────────────────────────────────────────────
  build: {
    manifest: true,
    outDir: "dist",        // Django will serve this folder
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/main.tsx"),
        scenario: resolve(__dirname, "src/ScenarioEditor.tsx"),
      },
      output: {
        // Ensure hashed filenames do NOT change folder structure
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});

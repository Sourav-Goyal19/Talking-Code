import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "esnext",
    minify: "esbuild",
    assetsDir: "assets",
    outDir: "./dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: "./popup.html",
      },
      external: ["App.css"],
    },
  },
});

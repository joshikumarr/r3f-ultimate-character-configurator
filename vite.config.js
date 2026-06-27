import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";

// Two entry points:
//   index.html    → the original character configurator
//   overlay.html  → the reactive companion (also loaded by the Electron pet)
// Relative base so the built overlay can be loaded via file:// inside Electron.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        overlay: resolve(__dirname, "overlay.html"),
      },
    },
  },
});

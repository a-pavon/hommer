import { defineConfig } from "vite";

export default defineConfig({
  base: "/hommer/",
  server: {
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});

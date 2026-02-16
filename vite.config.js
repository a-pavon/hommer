import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    // HTTPS is required for camera access on mobile devices
    // In development, Vite generates a self-signed certificate
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});

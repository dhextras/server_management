import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  server: {
    port: 3000,
  },
  preview: {
    allowedHosts: ["servers.maribeth.io"],
  },
});

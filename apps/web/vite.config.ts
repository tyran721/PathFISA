import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  ...(command === "serve"
    ? {
        optimizeDeps: {
          noDiscovery: true,
          include: [
            "react",
            "react-dom",
            "react-dom/client",
            "react/jsx-runtime",
            "react/jsx-dev-runtime",
            "react-router-dom",
            "lucide-react",
            "openseadragon"
          ]
        }
      }
    : {}),
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000"
    }
  },
  preview: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000"
    }
  }
}));

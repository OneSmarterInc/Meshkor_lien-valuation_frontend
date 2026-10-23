import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// In development, /api is proxied to the Django backend (VITE_DEV_API_TARGET, default http://localhost:8000).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { "/api": { target: env.VITE_DEV_API_TARGET || "http://localhost:8000", changeOrigin: true } },
    },
  };
});

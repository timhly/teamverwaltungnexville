import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  base: loadEnv(mode, process.cwd(), "VITE_").VITE_BASE_PATH || "/",
  server: {
    watch: { ignored: ["**/test-results/**", "**/playwright-report/**"] },
  },
  build: { target: "es2022" },
}));

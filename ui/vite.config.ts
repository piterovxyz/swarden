import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../", "");
  const backendPort = env.BACKEND_PORT || "6701";
  const frontendPort = Number(env.FRONTEND_PORT) || 5173;

  return {
    plugins: [svelte()],
    server: {
      host: "127.0.0.1",
      allowedHosts: env.ALLOWED_HOSTS ? env.ALLOWED_HOSTS.split(",") : true,
      port: frontendPort,
      proxy: {
        "/metrics": {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
          ws: false,
        },
      },
      watch: {
        usePolling: true,
      },
    },
  };
});

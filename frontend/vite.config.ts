import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, "../", "");
    const backendPort = env.PORT || "8080";
    const backendHost = env.HOST || "127.0.0.1";
    const targetHost = backendHost === "0.0.0.0" ? "127.0.0.1" : backendHost;

    return {
        plugins: [svelte()],
        server: {
            port: Number(env.FRONTEND_PORT) || 5173,
            proxy: {
                "/metrics": {
                    target: `http://${targetHost}:${backendPort}`,
                    changeOrigin: true,
                    ws: false,
                },
            },
        },
        build: {
            outDir: "../internal/server/dist",
            emptyOutDir: true,
        }
    };
});

import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [
			react(),
			tailwindcss(),
			VitePWA({
				registerType: "autoUpdate",
				includeAssets: ["favicon.svg", "icons.svg"],
				manifest: {
					name: "IAS Study Notes Generator",
					short_name: "IAS Notes",
					description:
						"Generate structured UPSC Mains study notes from web search and LLM.",
					theme_color: "#863bff",
					background_color: "#ffffff",
					display: "standalone",
					start_url: "/",
					icons: [
						{
							src: "/pwa-192x192.png",
							sizes: "192x192",
							type: "image/png",
						},
						{
							src: "/pwa-512x512.png",
							sizes: "512x512",
							type: "image/png",
						},
						{
							src: "/maskable-512x512.png",
							sizes: "512x512",
							type: "image/png",
							purpose: "maskable",
						},
					],
				},
				workbox: {
					globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
					maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
					navigateFallback: "/index.html",
				},
				devOptions: {
					enabled: true,
				},
			}),
		],
		resolve: {
			alias: {
				"@": path.resolve(import.meta.dirname, "./src"),
			},
		},
		server: {
			port: Number(env.VITE_PORT) || 5173,
			strictPort: true,
			proxy: {
				"/api": {
					target: env.VITE_API_TARGET || "http://localhost:3001",
					changeOrigin: true,
				},
			},
		},
		build: {
			chunkSizeWarningLimit: 1000,
			rollupOptions: {
				output: {
					manualChunks(id: string) {
						if (id.includes("node_modules")) {
							if (
								id.includes("react") ||
								id.includes("react-dom") ||
								id.includes("react-router-dom")
							) {
								return "vendor";
							}
							if (id.includes("@tanstack")) {
								return "query";
							}
							if (id.includes("lucide-react")) {
								return "ui";
							}
						}
					},
				},
			},
		},
	};
});

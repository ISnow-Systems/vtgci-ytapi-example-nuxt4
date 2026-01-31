// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: {
		enabled: true,
	},
	runtimeConfig: {
		public: {
			VTGCI_API_ORIGIN_URL: process.env.VTGCI_API_ORIGIN_URL ?? "https://infra.virtlive.jp",
			VTGCI_YTAPI_BASE_PATH: process.env.VTGCI_YTAPI_BASE_PATH ?? "/api/youtube/v3",
			VTGCI_WS_BASE_PATH: process.env.VTGCI_WS_BASE_PATH ?? "/ws/youtube",
		},
	},
	vite: {
		plugins: [
			tailwindcss(),
		],
	},
	css: ['~/assets/tailwind.css'],
});

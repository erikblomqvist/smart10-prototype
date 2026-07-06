import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		//
		// Pin the serverless runtime explicitly instead of inferring it from the
		// build machine's Node version — the adapter only auto-detects Node 20/22/24,
		// so a newer local Node (e.g. 26) would otherwise fail the build. nodejs24.x
		// is Vercel's current LTS default.
		adapter: adapter({ runtime: 'nodejs24.x' }),
	},
};

export default config;

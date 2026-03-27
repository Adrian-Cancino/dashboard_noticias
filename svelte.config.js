// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),  // ✅ Sin configuración especial necesaria
    // ✅ Esta línea asegura que las variables PUBLIC_ estén disponibles
    env: {
      publicPrefix: 'PUBLIC_'
    }
  }
};

export default config;
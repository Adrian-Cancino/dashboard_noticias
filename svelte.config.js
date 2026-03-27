// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // ✅ Especificar rutas explícitas para evitar ambigüedades
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    }),
    env: {
      publicPrefix: 'PUBLIC_'  // ✅ Importante para variables de entorno
    }
  }
};

export default config;
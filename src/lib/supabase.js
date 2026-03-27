import { createClient } from '@supabase/supabase-js';
// ✅ Usar el método oficial de SvelteKit para variables públicas
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

console.log('🔍 [Supabase] Iniciando cliente...');
console.log('🔗 URL:', PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
console.log('🔑 Key presente:', !!PUBLIC_SUPABASE_ANON_KEY);

// Validación explícita
if (!PUBLIC_SUPABASE_URL) {
  console.error('❌ PUBLIC_SUPABASE_URL no está definida');
  throw new Error('PUBLIC_SUPABASE_URL is required. Revisa las variables en Cloudflare Pages.');
}

if (!PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ PUBLIC_SUPABASE_ANON_KEY no está definida');
  throw new Error('PUBLIC_SUPABASE_ANON_KEY is required. Revisa las variables en Cloudflare Pages.');
}

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
import { createClient } from '@supabase/supabase-js';

// 🔍 DEBUG: Verificar variables de entorno
console.log('🔍 [Supabase] Debug de variable:');
console.log('  PUBLIC_SUPABASE_URL:', import.meta.env.PUBLIC_SUPABASE_URL);
console.log('  PUBLIC_SUPABASE_ANON_KEY:', import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
console.log('  import.meta.env:', import.meta.env);

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// ✅ Validación explícita antes de crear el cliente
if (!supabaseUrl) {
  console.error('❌ [Supabase] PUBLIC_SUPABASE_URL no está definida o está vacía');
  throw new Error('PUBLIC_SUPABASE_URL is required. Revisa las variables de entorno en Cloudflare Pages.');
}

if (!supabaseAnonKey) {
  console.error('❌ [Supabase] PUBLIC_SUPABASE_ANON_KEY no está definida o está vacía');
  throw new Error('PUBLIC_SUPABASE_ANON_KEY is required. Revisa las variables de entorno en Cloudflare Pages.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
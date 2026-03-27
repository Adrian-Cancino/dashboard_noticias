import { createClient } from '@supabase/supabase-js';

// ✅ Estas variables deben tener prefijo PUBLIC_ para estar en el frontend
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
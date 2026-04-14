import { createClient } from '@supabase/supabase-js';

// ✅ Estas variables deben tener prefijo PUBLIC_ para estar en el frontend
const supabaseUrl = 'https://bggpzfjmykggxggyvajw.supabase.co';
const supabaseUrlMapa = 'https://snuqocdmzqltnwvlrycd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZ3B6ZmpteWtnZ3hnZ3l2YWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTI1ODgsImV4cCI6MjA3Mzk4ODU4OH0.J2t5ciS3lumcZWjVT6ZNwll6ApuN-DqlgGt6BjwI2LE';
const supabaseAnonKeyMap = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNudXFvY2RtenFsdG53dmxyeWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjE1OTEsImV4cCI6MjA3Mzc5NzU5MX0.oLiX6AKkNyEBYZb6BakQBzIk_CAb0Bpp_eIwmvAZIlk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseMapa = createClient(supabaseUrlMapa, supabaseAnonKeyMap);
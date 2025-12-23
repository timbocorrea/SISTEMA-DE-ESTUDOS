import { createClient, SupabaseClient } from '@supabase/supabase-js';

const resolveEnvVar = (key: string): string | undefined => {
  const processEnv = typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : {};
  const windowEnv = typeof window !== 'undefined' ? (window as any).env || {} : {};
  const importMetaEnv = (import.meta as any)?.env || {};

  return (
    processEnv[key] ||
    processEnv[`VITE_${key}`] ||
    windowEnv[key] ||
    importMetaEnv[key] ||
    importMetaEnv[`VITE_${key}`]
  );
};

let cachedClient: SupabaseClient | null = null;

export const createSupabaseClient = (): SupabaseClient => {
  if (cachedClient) return cachedClient;

  const supabaseUrl = resolveEnvVar('SUPABASE_URL');
  const supabaseAnonKey = resolveEnvVar('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
};

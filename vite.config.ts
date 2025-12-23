import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega todas as variáveis do .env.local
  const env = loadEnv(mode, process.cwd(), '');

  // Prioridade: VITE_API_KEY > GEMINI_API_KEY > API_KEY
  const apiKey = env.VITE_API_KEY || env.GEMINI_API_KEY || env.API_KEY || '';
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    plugins: [react()],
    define: {
      // Injeta no código como process.env.API_KEY (exigência da SDK Gemini)
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'window.env': {
        SUPABASE_URL: supabaseUrl,
        SUPABASE_ANON_KEY: supabaseAnonKey
      }
    },
    server: {
      port: 3000,
      open: true
    }
  };
});

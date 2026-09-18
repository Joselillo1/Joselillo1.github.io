import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// El polyfill de URL/fetch es necesario en nativo (Hermes no trae uno completo),
// pero en web rompe el `fetch` propio del navegador — provoca el error "Failed to
// execute 'fetch'... String contains non ISO-8859-1 code point" al loguearse.
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env y completa tus datos de Supabase.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

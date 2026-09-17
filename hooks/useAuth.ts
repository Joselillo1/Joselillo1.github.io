import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { authService } from '../services/authService';

export function useAuth(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getSession().then((s) => {
      setSession(s);
      setLoading(false);
    });
    const unsubscribe = authService.onAuthStateChange((s) => setSession(s));
    return unsubscribe;
  }, []);

  return { session, loading };
}

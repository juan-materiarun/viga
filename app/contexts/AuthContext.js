'use client';
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // NUEVO: Para company_name, vigas_balance, etc.
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      if (data) setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error.message);
      setProfile(null);
    }
  };

  const currentUserRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const newUser = session?.user ?? null;

      // Update state only if changed
      if (newUser?.id !== currentUserRef.current) {
        setUser(newUser);
        currentUserRef.current = newUser?.id;

        if (newUser) {
          // Fetch profile immediately
          if (mounted) fetchProfile(newUser.id);
          document.cookie = `viga-session=${session.access_token}; path=/; max-age=3600`;
        } else {
          setProfile(null);
          document.cookie = "viga-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }
      }

      setLoading(false);
    });

    // Safety timeout: don't block the app forever if auth is slow/broken
    const timer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000); // Reduced from 5000ms to 2000ms

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile: () => fetchProfile(user?.id) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
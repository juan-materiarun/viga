'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, Beaker, Box, Settings, ChevronRight, Moon, Sun, LogOut } from 'lucide-react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext'; 
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase.js';
import './globals.css';

// --- CONTEXTO DE AUTENTICACIÓN ---
const AuthContext = createContext({});

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        document.cookie = `viga-session=${session.access_token}; path=/; max-age=3600; SameSite=Lax`;
      } else {
        document.cookie = "viga-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// --- CONTENIDO DEL LAYOUT ---
function LayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const isPublicPage = pathname === '/' || pathname === '/login';

  if (isPublicPage) {
    return (
      <main className={`w-full min-h-screen relative transition-none ${theme === 'dark' ? 'bg-[#030303] text-white' : 'bg-white text-slate-900'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    );
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-none ${theme === 'dark' ? 'bg-[#030303] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* SIDEBAR - LOGO VIGA ARRIBA A LA IZQUIERDA */}
      <aside className={`w-72 border-r transition-none ${theme === 'dark' ? 'border-white/5 bg-[#080808]' : 'border-slate-200 bg-white'} flex flex-col shrink-0 z-20`}>
        <div className="p-8 h-24 flex items-center">
          <Link href="/dashboard" className="relative w-40 h-12 group transition-transform active:scale-95">
            <Image 
              src={theme === 'dark' ? '/VIGA-blacklogo.png' : '/VIGA-lightlogo.png'} 
              alt="VIGA Logo" 
              fill
              className="object-contain object-left transition-none"
              priority
            />
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {[
            { icon: <LayoutGrid size={18}/>, label: 'Overview', href: '/dashboard' },
            { icon: <Beaker size={18}/>, label: 'Test Suites', href: '/tests' },
            { icon: <Box size={18}/>, label: 'Infrastructure', href: '/infrastructure' },
            { icon: <Settings size={18}/>, label: 'Settings', href: '/settings' }
          ].map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-none
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' 
                    : 'text-slate-500 hover:text-blue-500 hover:bg-blue-500/5'}`}>
                  {item.icon} {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={18} /> Terminate
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative h-screen transition-none">
        <header className={`h-16 border-b transition-none ${theme === 'dark' ? 'border-white/5 bg-[#080808]/50' : 'border-slate-200 bg-white/50'} backdrop-blur-md px-8 flex items-center justify-between z-10`}>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
            <span>Platform</span> 
            <ChevronRight size={10} className="text-blue-600" /> 
            <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
              {pathname.substring(1) || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={toggleTheme} className={`p-2 rounded-xl border transition-none ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="text-right transition-none">
                <p className={`text-[10px] font-black uppercase leading-none mb-1 transition-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {user?.email?.split('@')[0] || 'Operator'}
                </p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                  ID: {user?.id?.substring(0, 8)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-600/20 transition-transform active:scale-95">
                {user?.email?.[0].toUpperCase() || 'V'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={{ duration: 0.2 }}
              className="p-10"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning className="scroll-smooth">
      <body className="antialiased">
        <AuthProvider>
          <ThemeProvider>
            <LayoutContent>{children}</LayoutContent>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
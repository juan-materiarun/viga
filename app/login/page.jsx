'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import Button from '../components/Button';
import Loader from '../components/Loader';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Credenciales incorrectas. Intenta nuevamente.'
        : authError.message);
      setIsLoading(false);
      return;
    }

    if (data.session) {
      document.cookie = `viga-session=${data.session.access_token}; path=/; max-age=3600; SameSite=Lax`;
      window.location.href = '/dashboard';
    }
  };

  // LOGO LOGIC: Forcing user choice - Light Logo always visible on the dark glass card/background?
  // User asked for "light theme logo"
  const logoSrc = '/VIGA-lightlogo.png';

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[var(--bg-primary)]">

      {/* Loader Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
          >
            <Loader fullScreen size="xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-[var(--accent-primary)]/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />
        <div className="absolute top-[40%] -right-[10%] w-[60vw] h-[60vw] bg-[var(--accent-secondary)]/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md mx-6 relative z-10"
      >
        {/* Glass Card */}
        <div className="bg-[var(--card-bg)]/60 backdrop-blur-2xl border border-[var(--border-color)]/50 p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden group">

          {/* Shine Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:animate-shine bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12" />

          {/* Header */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative w-full h-24 mx-auto mb-8 overflow-visible"
            >
              <Image
                src={logoSrc}
                alt="VIGA Logo"
                fill
                className="object-contain filter drop-shadow-[0_0_15px_rgba(255,255,200,0.05)]"
                priority
              />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold text-[var(--text-primary)] mb-2"
            >
              Bienvenido
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[var(--text-secondary)]"
            >
              Ingresa a tu consola de control
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-muted)] ml-1 uppercase tracking-wider">
                {t('auth.email')}
              </label>
              <div className="relative group/input">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within/input:text-[var(--accent-primary)] transition-colors" size={20} />
                <input
                  type="email"
                  required
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] pl-12 pr-4 py-3.5 rounded-xl focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all placeholder:text-[var(--text-muted)]/50 font-medium"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-muted)] ml-1 uppercase tracking-wider">
                {t('auth.password')}
              </label>
              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within/input:text-[var(--accent-primary)] transition-colors" size={20} />
                <input
                  type="password"
                  required
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] pl-12 pr-4 py-3.5 rounded-xl focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all placeholder:text-[var(--text-muted)]/50 font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3"
                >
                  <AlertCircle size={18} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-500 font-semibold leading-none pt-0.5">
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full h-12 text-lg shadow-lg hover:shadow-[var(--accent-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>{t('auth.login')}</span>
                <ArrowRight size={20} className="ml-2" />
              </Button>
            </div>
          </form>
        </div>

        {/* Footer Text */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-8 opacity-60">
          Protegido por reCAPTCHA y sujeto a la Política de Privacidad y Términos de Servicio de VIGA.
        </p>
      </motion.div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldCheck, AlertCircle, Cpu } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message === 'Invalid login credentials' ? 'Acceso Denegado: Credenciales Inválidas' : authError.message);
      setIsLoading(false);
      return;
    }

    if (data.session) {
      document.cookie = `viga-session=${data.session.access_token}; path=/; max-age=3600; SameSite=Lax`;
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] flex flex-col items-center relative overflow-hidden selection:bg-blue-600/30">
      
      {/* BACKGROUND DECORATION - Red Neuronal sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1e3a8a10_0%,transparent_50%)] pointer-events-none" />

      {/* CONTENEDOR PRINCIPAL - Posicionamiento Manual */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center pt-24">
        
        {/* LOGO - Movido hacia arriba y sin interferencia de hitbox */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-[280px] h-[100px] pointer-events-none mb-4"
        >
          <Image 
            src="/VIGA-blacklogo.png" 
            alt="Logo Viga" 
            fill
            className="object-contain" 
            priority 
          />
        </motion.div>
        
        {/* FORMULARIO - Sube más que el logo para quedar pegado */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-[#080808]/80 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
        >
          <div className="mb-8 space-y-1 text-center">
            <h2 className="text-white font-black text-xs uppercase tracking-[0.4em]">Internal Security</h2>
            <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest italic">Authorization Required</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <Cpu size={10} className="text-blue-600" /> Operator Identity
                </label>
              </div>
              <input 
                type="email" required disabled={isLoading}
                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-bold text-white outline-none focus:border-blue-600 focus:bg-white/[0.04] transition-all placeholder:text-white/5"
                placeholder="identity@viga.run"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-2 tracking-widest">Access Protocol</label>
              <input 
                type="password" required disabled={isLoading}
                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-bold text-white outline-none focus:border-blue-600 focus:bg-white/[0.04] transition-all"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3"
                >
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <p className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              disabled={isLoading} 
              className="relative w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/50 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] transition-all overflow-hidden group active:scale-[0.98]"
            >
              <span className={`flex items-center justify-center gap-3 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                Establish Connection <ShieldCheck size={14} />
              </span>
              
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="animate-spin" size={20} />
                </div>
              )}
              
              {/* Efecto de brillo al pasar el mouse */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          </form>
        </motion.div>

        {/* FOOTER DEL LOGIN */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex flex-col items-center gap-4"
        >
          <div className="h-[1px] w-12 bg-white/10" />
          <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.5em]">
            VIGA by Materia © 2026
          </p>
        </motion.div>
      </div>

      {/* LINEAS DE SCANNER DECORATIVAS */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-scan" />
    </div>
  );
}
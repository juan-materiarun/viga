'use client';
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Loader2, AlertCircle, Activity, 
  Zap, Scan, Shield, Download, Camera 
} from 'lucide-react';
import { supabase } from '../../lib/supabase'; 
import { useTheme } from '../contexts/ThemeContext';

export default function ChaosTerminal({ suiteId, open, onClose }) {
  const [steps, setSteps] = useState([]);
  const [status, setStatus] = useState('running');
  const { theme } = useTheme();
  const scrollRef = useRef(null);

  // Función para descargar el screenshot actual
  const downloadScreenshot = async () => {
    const lastScreenshot = steps.slice().reverse().find(s => s.screenshot_url)?.screenshot_url;
    if (!lastScreenshot) return;

    try {
      const response = await fetch(lastScreenshot);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VIGA-EVIDENCE-${suiteId}-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading screenshot", err);
    }
  };

  useEffect(() => {
    if (!suiteId || !open) return;

    // Carga inicial
    supabase
      .from('test_steps')
      .select('*')
      .eq('suite_id', suiteId)
      .order('created_at', { ascending: true })
      .then(({ data }) => data && setSteps(data));

    // Suscripción Realtime
    const channel = supabase
      .channel(`viga_live_${suiteId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'test_steps', 
        filter: `suite_id=eq.${suiteId}` 
      }, payload => {
        setSteps(prev => {
          if (prev.find(s => s.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE', 
        schema: 'public', 
        table: 'test_suites', 
        filter: `id=eq.${suiteId}`
      }, payload => {
        setStatus(payload.new.status);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [suiteId, open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [steps]);

  if (!open) return null;
  const isDark = theme === 'dark';
  const currentScreenshot = steps.slice().reverse().find(s => s.screenshot_url)?.screenshot_url;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[10000] flex flex-col p-6 md:p-10 ${isDark ? 'bg-[#050505]' : 'bg-slate-50'}`}
    >
      <header className="relative z-10 flex justify-between items-center mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-600/20 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Live Mission Control
          </div>
          <h1 className={`text-4xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Neural <span className="text-blue-600">Overview</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className={`px-6 py-3 rounded-2xl border flex items-center gap-3 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 shadow-sm text-slate-900'}`}>
            <span className="text-[10px] font-black uppercase text-slate-500">Suite:</span>
            <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
          </div>
          <button onClick={onClose} className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 shadow-sm text-slate-900'}`}>
            <X size={20} />
          </button>
        </div>
      </header>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
        
        {/* IZQUIERDA: STREAM DE PASOS */}
        <div className="lg:col-span-6 flex flex-col space-y-4 overflow-hidden">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
              <Activity size={14} /> Intelligence Feed
            </span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto pr-4 space-y-4 scrollbar-hide">
            <AnimatePresence mode="popLayout">
              {steps.map((step) => (
                <motion.div key={step.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`p-6 rounded-[32px] border flex items-start gap-6 ${isDark ? 'bg-[#080808] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}
                >
                  <div className={`p-4 rounded-2xl ${step.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    <Zap size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm font-black uppercase tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{step.selector || 'Thinking...'}</h3>
                    <p className="text-xs text-slate-500 font-medium mb-3">{step.expected_result}</p>
                    <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase ${step.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                      <Shield size={10} /> {step.status === 'success' ? 'Verified' : 'Mutation Detected'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* DERECHA: MONITOR DE VISION + BOTÓN SAVE */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          <div className={`flex-1 rounded-[40px] border overflow-hidden relative group ${isDark ? 'bg-[#080808] border-white/5' : 'bg-white border-slate-200 shadow-xl'}`}>
            
            {/* OVERLAY: BOTÓN SAVE SCREENSHOT */}
            <div className="absolute top-6 right-6 z-30 flex gap-2">
               {currentScreenshot && (
                 <button 
                  onClick={downloadScreenshot}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                 >
                   <Download size={14} /> Save Evidence
                 </button>
               )}
            </div>

            <div className="absolute top-6 left-6 z-20">
               <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                 <Camera size={12} className="text-blue-400" /> Neural Vision Feed
               </div>
            </div>

            <AnimatePresence mode="wait">
              {currentScreenshot ? (
                <motion.img 
                  key={currentScreenshot} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  src={currentScreenshot} className="w-full h-full object-cover" alt="VIGA Vision"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-slate-900/10">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                </div>
              )}
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          </div>

          {/* METRICAS INFERIORES */}
          <div className={`p-8 rounded-[32px] border flex justify-between items-center ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200'}`}>
             <div className="flex items-center gap-4">
               <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><Scan size={20}/></div>
               <div>
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Cluster</p>
                 <p className={`text-sm font-black uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>MATERIA-RUN-S1</p>
               </div>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Node Count</p>
                <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{steps.length}</p>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
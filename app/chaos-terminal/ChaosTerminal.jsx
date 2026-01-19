'use client';
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Activity, Terminal as TerminalIcon, ShieldAlert, CheckCircle2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

export default function ChaosTerminal({ suiteId, open, onClose }) {
  const [steps, setSteps] = useState([]);
  const [status, setStatus] = useState('running');
  const [selectedStep, setSelectedStep] = useState(null);
  const scrollRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleSaveRegression = async () => {
    const name = prompt("Nombre para este Set de Regresión:", "Regression Test V1");
    if (!name) return;

    const { error } = await supabase.from('test_suites').update({
      name: `[REGRESSION] ${name}`,
      is_regression: true
    }).eq('id', suiteId);

    if (error) {
      console.error("Save Error:", error);
      // Fallback update without the column if it failed
      await supabase.from('test_suites').update({ name: `[REGRESSION] ${name}` }).eq('id', suiteId);
      alert("Test guardado con tag [REGRESSION]. (Sugerencia: agrega la columna 'is_regression' (boolean, default: false) a la tabla 'test_suites' para un filtrado profesional)");
    } else {
      alert("¡Guardado como Regresión! Podrás re-ejecutarlo desde la sección Tests.");
    }
  };

  useEffect(() => {
    if (!suiteId || !open) return;
    setSteps([]);

    supabase.from('test_steps')
      .select('*')
      .eq('suite_id', suiteId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          // Add types to initial steps
          const formattedSteps = data.map(s => ({ ...s, type: 'step' }));
          setSteps(formattedSteps);
          const lastWithImg = data.slice().reverse().find(s => s.screenshot_url);
          if (lastWithImg) setSelectedStep(lastWithImg);
        }
      });

    const channel = supabase.channel(`viga_live_${suiteId}`)
      // Listen for Steps (Screenshots/Evidence)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'test_steps', filter: `suite_id=eq.${suiteId}`
      }, payload => {
        setSteps(prev => {
          if (prev.find(s => s.id === payload.new.id)) return prev;
          const newStep = { ...payload.new, type: 'step' };
          const newArr = [...prev, newStep].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          if (payload.new.screenshot_url) setSelectedStep(payload.new);
          return newArr;
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'test_suites', filter: `id=eq.${suiteId}`
      }, payload => setStatus(payload.new.status))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [suiteId, open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[10000] flex flex-col font-sans transition-colors duration-300 ${isDark ? 'bg-[#050505]' : 'bg-slate-50'}`}
    >
      {/* HEADER DE COMANDO */}
      <div className={`h-16 border-b flex items-center justify-between px-8 backdrop-blur-md ${isDark ? 'border-white/10 bg-black/50' : 'border-slate-200 bg-white/80'}`}>
        <div className="flex items-center gap-4">
          <Zap className="text-orange-500 fill-orange-500" size={20} />
          <div className={`h-4 w-[1px] ${isDark ? 'bg-white/20' : 'bg-slate-200'}`} />
          <h2 className={`text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Execution Room <span className="text-orange-500 ml-2">ID: {suiteId?.slice(0, 8)}</span>
          </h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${status === 'completed' || status === 'success' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{status}</span>
          </div>

          {(status === 'completed' || status === 'success') && (
            <button
              onClick={handleSaveRegression}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${isDark
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                }`}
            >
              <Save size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Guardar Test Set</span>
            </button>
          )}

          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
            <X size={20} className={isDark ? 'text-white' : 'text-slate-900'} />
          </button>
        </div>
      </div>

      {/* CUERPO PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden">

        {/* PANEL IZQUIERDO: LOGS */}
        <div className={`w-[400px] border-r flex flex-col ${isDark ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-slate-50/50'}`}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {steps.map((step, idx) => (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                key={step.id}
                onClick={() => step.screenshot_url && setSelectedStep(step)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${selectedStep?.id === step.id
                  ? 'bg-orange-500/10 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.1)]'
                  : isDark
                    ? 'bg-white/5 border-transparent hover:border-white/10'
                    : 'bg-white border-transparent hover:border-slate-200 shadow-sm'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm ${step.status === 'success' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'
                    }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-black uppercase tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{step.title}</p>
                    <p className="text-[9px] text-slate-500 mt-1 font-mono uppercase tracking-tighter">Status: {step.status}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* PANEL DERECHO: VISOR DE EVIDENCIA FULL */}
        <div className={`flex-1 relative p-8 flex flex-col ${isDark ? 'bg-[#080808]' : 'bg-slate-100'}`}>
          <AnimatePresence mode='wait'>
            {selectedStep ? (
              <motion.div
                key={selectedStep.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full flex flex-col"
              >
                <div className={`relative flex-1 rounded-[30px] overflow-hidden border shadow-2xl ${isDark ? 'border-white/10 bg-black' : 'border-slate-200 bg-white'}`}>
                  {selectedStep.screenshot_url ? (
                    <img
                      src={selectedStep.screenshot_url}
                      className="w-full h-full object-contain"
                      alt="Evidence"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">No Screenshot</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 pointer-events-none" />
                </div>

                <div className={`mt-6 p-6 border rounded-[24px] ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-orange-500" />
                    <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Neural Analysis</span>
                  </div>
                  <p className={`text-sm font-medium leading-relaxed italic ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    "{selectedStep.expected_result}"
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                <Activity size={48} className={`animate-spin duration-[4s] mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`} />
                <span className={`text-xs font-black uppercase tracking-[0.5em] ${isDark ? 'text-white' : 'text-slate-900'}`}>Awaiting Uplink...</span>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ea580c; }
      `}</style>
    </motion.div>
  );
}
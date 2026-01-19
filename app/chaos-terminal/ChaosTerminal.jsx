'use client';
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Activity, Terminal as TerminalIcon, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase'; 

export default function ChaosTerminal({ suiteId, open, onClose }) {
  const [steps, setSteps] = useState([]);
  const [status, setStatus] = useState('running');
  const [selectedStep, setSelectedStep] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!suiteId || !open) return;
    setSteps([]); 

    supabase.from('test_steps')
      .select('*')
      .eq('suite_id', suiteId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setSteps(data);
          const lastWithImg = data.slice().reverse().find(s => s.screenshot_url);
          if (lastWithImg) setSelectedStep(lastWithImg);
        }
      });

    const channel = supabase.channel(`viga_live_${suiteId}`)
      .on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'test_steps', filter: `suite_id=eq.${suiteId}` 
      }, payload => {
        setSteps(prev => {
          if (prev.find(s => s.id === payload.new.id)) return prev;
          const newSteps = [...prev, payload.new];
          if (payload.new.screenshot_url) setSelectedStep(payload.new);
          return newSteps;
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
      className="fixed inset-0 z-[10000] bg-[#050505] flex flex-col font-sans"
    >
      {/* HEADER DE COMANDO */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Zap className="text-orange-500 fill-orange-500" size={20} />
          <div className="h-4 w-[1px] bg-white/20" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">
            Execution Room <span className="text-orange-500 ml-2">ID: {suiteId?.slice(0,8)}</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${status === 'completed' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{status}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* CUERPO PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANEL IZQUIERDO: LOGS */}
        <div className="w-[400px] border-r border-white/10 flex flex-col bg-black/40">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {steps.map((step, idx) => (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                key={step.id}
                onClick={() => step.screenshot_url && setSelectedStep(step)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  selectedStep?.id === step.id 
                  ? 'bg-orange-500/10 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.1)]' 
                  : 'bg-white/5 border-transparent hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm ${
                    step.status === 'success' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white uppercase tracking-tight truncate">{step.title}</p>
                    <p className="text-[9px] text-slate-500 mt-1 font-mono uppercase tracking-tighter">Status: {step.status}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* PANEL DERECHO: VISOR DE EVIDENCIA FULL */}
        <div className="flex-1 relative bg-[#080808] p-8 flex flex-col">
          <AnimatePresence mode='wait'>
            {selectedStep ? (
              <motion.div 
                key={selectedStep.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full flex flex-col"
              >
                <div className="relative flex-1 rounded-[30px] overflow-hidden border border-white/10 bg-black shadow-2xl">
                  <img 
                    src={selectedStep.screenshot_url} 
                    className="w-full h-full object-contain" 
                    alt="Evidence" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 pointer-events-none" />
                </div>
                
                <div className="mt-6 p-6 bg-white/5 border border-white/10 rounded-[24px]">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity size={14} className="text-orange-500" />
                        <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Neural Analysis</span>
                    </div>
                    <p className="text-sm text-slate-300 font-medium leading-relaxed italic">
                      "{selectedStep.expected_result}"
                    </p>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                <Activity size={48} className="animate-spin duration-[4s] mb-4 text-white" />
                <span className="text-xs font-black uppercase tracking-[0.5em] text-white">Awaiting Uplink...</span>
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
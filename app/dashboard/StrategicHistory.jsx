'use client';
import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, ShieldCheck, 
  AlertCircle, ArrowUpRight, PlayCircle, History, Loader2, Zap, Trash2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useTheme } from '../contexts/ThemeContext';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function StrategicHistory({ onReplay }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  async function fetchGlobalStats() {
    try {
      // 1. Traer los últimos 6 registros
      const { data, error } = await supabase
        .from('test_suites')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;

      // 2. LÓGICA ANTI-ZOMBIE: 
      // Si un test está 'running' hace más de 5 minutos, lo consideramos fallido/stale
      const now = new Date();
      const cleanedData = data.map(run => {
        const runTime = new Date(run.created_at);
        const diffMinutes = (now - runTime) / (1000 * 60);
        
        if (run.status === 'running' && diffMinutes > 5) {
          return { ...run, status: 'stale' }; // 'stale' indica que la IA se perdió
        }
        return run;
      });

      setHistory(cleanedData);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  }

  // Función para limpiar sesiones colgadas manualmente
  const clearStaleSessions = async () => {
    const { error } = await supabase
      .from('test_suites')
      .update({ status: 'error' })
      .eq('status', 'running');
    
    if (!error) fetchGlobalStats();
  };

  const successRate = history.length > 0 
    ? (history.filter(s => s.status === 'success' || s.status === 'completed').length / history.length) * 100 
    : 0;

  if (loading) {
    return (
      <div className={`mt-12 flex flex-col items-center justify-center p-20 border rounded-[40px] ${
        isDark ? 'border-white/5 bg-black/20' : 'border-slate-200 bg-slate-50'
      }`}>
        <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
        <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Recuperando Inteligencia...
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={`mt-12 border border-dashed rounded-[40px] p-24 text-center ${
        isDark ? 'border-white/10 bg-[#080808]' : 'border-slate-300 bg-white shadow-inner'
      }`}>
        <Zap className={`mx-auto mb-4 ${isDark ? 'text-slate-800' : 'text-slate-200'}`} size={40}/>
        <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          No hay misiones previas detectadas
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* HEADER ESTRATÉGICO */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[10px] font-black uppercase text-blue-500 tracking-[0.3em] flex items-center gap-2">
            <History size={14}/> Fleet Deployment History
          </h3>
          <p className={`text-[9px] uppercase font-bold italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Auditoría de integridad para stakeholders
          </p>
        </div>
        <div className="flex gap-6 items-center">
          <button 
            onClick={clearStaleSessions}
            className={`p-2 rounded-xl border flex items-center gap-2 text-[8px] font-black uppercase transition-all ${
              isDark ? 'border-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-500' : 'border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600'
            }`}
          >
            <Trash2 size={12}/> Clear Running
          </button>
          <div className="text-right">
            <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Trust Score
            </p>
            <p className={`text-sm font-black ${successRate > 70 ? 'text-emerald-500' : 'text-orange-500'} flex items-center gap-2 justify-end`}>
              {successRate.toFixed(1)}% 
              {successRate > 70 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
            </p>
          </div>
        </div>
      </div>

      {/* GRID DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {history.map((run) => (
          <div 
            key={run.id}
            onClick={() => onReplay(run.base_url)}
            className={`p-6 rounded-[32px] border transition-all group cursor-pointer relative overflow-hidden ${
              isDark 
                ? 'bg-[#0A0A0A] border-white/5 hover:border-blue-500/30' 
                : 'bg-white border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-xl'
            }`}
          >
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`p-2.5 rounded-xl ${
                run.status === 'completed' || run.status === 'success'
                ? 'bg-emerald-500/10 text-emerald-500' 
                : run.status === 'running' ? 'bg-blue-500/10 text-blue-500 animate-pulse' : 'bg-red-500/10 text-red-500'
              }`}>
                {run.status === 'completed' || run.status === 'success' ? <ShieldCheck size={18}/> : <AlertCircle size={18}/>}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-all bg-blue-600 p-2 rounded-full text-white shadow-lg shadow-blue-500/40">
                <PlayCircle size={16}/>
              </div>
            </div>
            
            <p className={`text-[11px] font-black truncate uppercase tracking-tight mb-2 relative z-10 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {run.name?.replace('SWARM:', '').trim() || 'Mission Alpha'}
            </p>
            
            <div className={`flex items-center gap-3 text-[9px] font-bold uppercase relative z-10 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <Clock size={12}/> {new Date(run.created_at).toLocaleDateString()}
              <span>•</span>
              <span className={`px-2 py-0.5 rounded-full ${
                run.status === 'completed' ? 'text-emerald-500 bg-emerald-500/5' : 
                run.status === 'running' ? 'text-blue-500 bg-blue-500/5' : 'text-red-500 bg-red-500/5'
              }`}>
                {run.status?.toUpperCase()}
              </span>
            </div>

            <div className={`mt-5 h-[3px] w-full rounded-full overflow-hidden relative z-10 ${
              isDark ? 'bg-white/5' : 'bg-slate-100'
            }`}>
              <div 
                className={`h-full transition-all duration-1000 ${
                  run.status === 'completed' ? 'bg-emerald-500' : run.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                }`} 
                style={{ width: (run.status === 'completed') ? '100%' : (run.status === 'running' ? '60%' : '100%') }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
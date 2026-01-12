'use client';
import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, ShieldCheck, 
  AlertCircle, ArrowUpRight, PlayCircle, History, Loader2, Zap,
  Activity, BarChart3
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
      const { data, error } = await supabase
        .from('test_suites')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      if (data) setHistory(data);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  }

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
      <div className={`mt-12 border border-dashed rounded-[40px] p-24 text-center animate-in fade-in duration-700 ${
        isDark ? 'border-white/10 bg-[#080808]' : 'border-slate-300 bg-white shadow-inner'
      }`}>
        <Zap className={`mx-auto mb-4 ${isDark ? 'text-slate-800' : 'text-slate-200'}`} size={40}/>
        <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          No hay misiones previas detectadas
        </p>
        <p className={`text-[9px] uppercase mt-2 ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>
          Lanza tu primera unidad operativa para generar historial estratégico.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* HEADER ESTRATÉGICO */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1 w-8 bg-blue-600 rounded-full" />
            <h3 className="text-[10px] font-black uppercase text-blue-500 tracking-[0.3em] flex items-center gap-2">
              <History size={14}/> Fleet Deployment History
            </h3>
          </div>
          <p className={`text-[9px] uppercase font-bold italic pl-10 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Auditoría de integridad para stakeholders & QA Leads
          </p>
        </div>
        
        <div className={`flex items-center gap-4 px-4 py-2 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-right">
            <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              System Trust Score
            </p>
            <p className={`text-sm font-black ${successRate > 80 ? 'text-emerald-500' : 'text-orange-500'} flex items-center gap-2 justify-end`}>
              {successRate.toFixed(1)}% 
              {successRate > 80 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
            </p>
          </div>
          <BarChart3 size={20} className={isDark ? 'text-white/10' : 'text-slate-200'} />
        </div>
      </div>

      {/* GRID DE MISIONES PASADAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {history.map((run) => (
          <div 
            key={run.id}
            onClick={() => onReplay(run.base_url)}
            className={`p-5 rounded-[24px] border transition-all group cursor-pointer relative overflow-hidden ${
              isDark 
                ? 'bg-[#0A0A0A] border-white/5 hover:border-blue-500/30' 
                : 'bg-white border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`p-2 rounded-lg ${
                run.status === 'success' || run.status === 'completed' 
                ? 'bg-emerald-500/10 text-emerald-500' 
                : 'bg-red-500/10 text-red-500'
              }`}>
                {run.status === 'success' || run.status === 'completed' ? <ShieldCheck size={16}/> : <AlertCircle size={16}/>}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                 <span className="text-[8px] font-black uppercase text-blue-600">Relaunch</span>
                 <div className="bg-blue-600 p-1.5 rounded-full text-white shadow-lg shadow-blue-500/40">
                  <PlayCircle size={14}/>
                 </div>
              </div>
            </div>
            
            <div className="mb-4">
              <p className={`text-[10px] font-black truncate uppercase tracking-tighter mb-1 relative z-10 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {run.name?.split(':')[1]?.trim() || run.name || 'Anonymous Mission'}
              </p>
              <p className={`text-[8px] font-mono opacity-50 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                OBJ_URL: {run.base_url}
              </p>
            </div>
            
            <div className={`flex items-center justify-between text-[8px] font-bold uppercase relative z-10 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <div className="flex items-center gap-2">
                <Clock size={10}/> {new Date(run.created_at).toLocaleDateString()}
              </div>
              <span className={`px-2 py-0.5 rounded-md ${
                run.status === 'success' || run.status === 'completed' 
                ? 'bg-emerald-500/5 text-emerald-500' 
                : 'bg-red-500/5 text-red-500'
              }`}>
                {run.status?.toUpperCase()}
              </span>
            </div>

            {/* BARRA DE INTEGRIDAD MINI */}
            <div className={`mt-4 h-[2px] w-full rounded-full overflow-hidden relative z-10 ${
              isDark ? 'bg-white/5' : 'bg-slate-100'
            }`}>
              <div 
                className={`h-full transition-all duration-1000 ${
                  run.status === 'success' || run.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'
                }`} 
                style={{ width: (run.status === 'success' || run.status === 'completed') ? '100%' : '40%' }}
              />
            </div>

            {/* EFECTO SCANNER HOVER */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
          </div>
        ))}

        {/* CARD DE INSIGHTS AVANZADOS (UP-SELL) */}
        <div className={`p-5 rounded-[24px] border border-dashed flex flex-col justify-center items-center text-center group transition-all cursor-not-allowed ${
          isDark 
            ? 'border-white/10 bg-white/[0.02] hover:bg-white/5' 
            : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100'
        }`}>
          <div className={`mb-3 p-2 rounded-full ${isDark ? 'bg-white/5 text-white/20' : 'bg-white text-slate-300 shadow-sm'}`}>
            <Activity size={16} />
          </div>
          <p className={`text-[8px] font-black uppercase mb-1 ${
            isDark ? 'text-slate-600' : 'text-slate-400'
          }`}>
            VIGA Global Analytics
          </p>
          <button className={`text-[9px] font-black flex items-center gap-2 uppercase tracking-widest transition-colors ${
            isDark ? 'text-white/30 group-hover:text-white/60' : 'text-slate-400 group-hover:text-slate-600'
          }`}>
            Full Audit Log <ArrowUpRight size={12}/>
          </button>
        </div>
      </div>
    </div>
  );
}
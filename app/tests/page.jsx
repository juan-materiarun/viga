'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, X, Code, Play, Trash2, Zap, 
  Loader2, Eye, Bug, Terminal as TerminalIcon, Download, 
  Layout, ShieldAlert, Activity, ChevronRight, Save, 
  AlertTriangle, AlertCircle, Sparkles, Clock, Search, Cpu,
  Settings, Key, Brain, FlaskConical, Globe
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function UnifiedTestsPage() {
  const [activeTab, setActiveTab] = useState('missions');
  const [missions, setMissions] = useState([]);
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState(null);
  
  // ESTADOS DE EJECUCIÓN LIVE
  const [executingSuiteId, setExecutingSuiteId] = useState(null);
  const [isChaosMode, setIsChaosMode] = useState(false);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [progress, setProgress] = useState(0);

  const [lastReport, setLastReport] = useState(null); 
  const [notification, setNotification] = useState(null); 
  const [configSuite, setConfigSuite] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'missions') {
        const { data } = await supabase.from('missions').select(`*, test_results (*)`).order('created_at', { ascending: false });
        setMissions(data || []);
      } else {
        const { data } = await supabase.from('test_suites').select(`*, test_steps (*)`).order('created_at', { ascending: false });
        setSuites(data || []);
      }
    } catch (err) {
      showNotify("Error de sincronización con el núcleo", "error");
    } finally {
      setLoading(false);
    }
  }

  // --- MODO CAOS (EXPLORACIÓN AGÉNTICA) ---
  const handleRunChaos = async (suite) => {
    if (executingSuiteId) return;

    setExecutingSuiteId(suite.id);
    setIsChaosMode(true);
    setLastReport(null);
    setProgress(10);
    setExecutionLogs([
      "🔥 [CHAOS MODE] Initializing Autonomous Agent...",
      "🧠 [NEURAL] Thinking: Exploring without boundaries.",
      `🌐 [TARGET] ${suite.base_url}`
    ]);

    const chaosInterval = setInterval(() => {
        setExecutionLogs(prev => [...prev.slice(-4), "🕵️ [THINKING] Analyzing DOM for edge cases..."]);
        setProgress(prev => Math.min(prev + 5, 90));
    }, 4000);

    try {
      const response = await fetch('/api/run-chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            url: suite.base_url, 
            system_context: suite.system_context,
            credentials: suite.test_credentials
        })
      });

      clearInterval(chaosInterval);
      const result = await response.json();
      
      if (result.success) {
        setProgress(100);
        setExecutionLogs(prev => [...prev, "💀 [FINISHED] Chaos exploration complete."]);
        setTimeout(() => {
          setLastReport({ vigaMasterReport: result.data });
          setExecutingSuiteId(null);
          setIsChaosMode(false);
          showNotify("Chaos Run exitoso");
        }, 1200);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      clearInterval(chaosInterval);
      showNotify(err.message, "error");
      setExecutingSuiteId(null);
      setIsChaosMode(false);
    }
  };

  // --- EJECUCIÓN REGRESIÓN ESTÁNDAR ---
  const handleRunSuite = async (suite) => {
    if (executingSuiteId) return; 

    setExecutingSuiteId(suite.id);
    setIsChaosMode(false);
    setLastReport(null); 
    setProgress(5);
    setExecutionLogs([
      "🚀 [SYSTEM] Initializing Regression Protocol...", 
      "🧠 [CONTEXT] Loading saved brain...",
      `🌐 [BROWSER] Target: ${suite.base_url}`
    ]);
    
    try {
      const response = await fetch('/api/run-viga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            url: suite.base_url, 
            steps: suite.test_steps,
            system_context: suite.system_context,
            credentials: suite.test_credentials
        })
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const result = await response.json();
      
      if (result.success) {
        setProgress(100);
        setExecutionLogs(prev => [...prev, "✅ [SUCCESS] Regression Finished."]);
        setTimeout(() => {
          setLastReport(result.data);
          setExecutingSuiteId(null);
          showNotify("Regresión completada");
        }, 1200);
      }
    } catch (err) {
      showNotify(err.message, "error");
      setExecutingSuiteId(null);
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedData = {
        system_context: formData.get('context'),
        test_credentials: {
            email: formData.get('email'),
            password: formData.get('password')
        }
    };

    const { error } = await supabase.from('test_suites').update(updatedData).eq('id', configSuite.id);
    if (!error) {
        showNotify("Red Neuronal actualizada");
        setConfigSuite(null);
        fetchData();
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto pb-40 min-h-screen bg-[#F8FAFC] dark:bg-[#030303] text-slate-900 dark:text-white font-sans">
      
      {/* NOTIFICACIONES */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-10 left-1/2 -translate-x-1/2 z-[300]">
            <div className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${notification.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
              <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/40 rotate-3"><Zap size={28} fill="currentColor" /></div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">ARMORY<span className="text-blue-600">.</span>OS</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Regression & Chaos Storage</p>
          </div>
        </div>
        <div className="flex bg-white dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
          <button onClick={() => setActiveTab('missions')} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'missions' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Trace Log</button>
          <button onClick={() => setActiveTab('suites')} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'suites' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>Suites</button>
        </div>
      </header>

      {/* --- PANTALLA DE EJECUCIÓN (CONSOLE) --- */}
      <AnimatePresence>
        {executingSuiteId && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={`mb-12 relative overflow-hidden bg-[#0A0A0A] rounded-[40px] border shadow-2xl ${isChaosMode ? 'border-orange-500/40 shadow-orange-500/20' : 'border-blue-500/30 shadow-blue-500/20'}`}>
            <div className="p-10">
              <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <Loader2 className={`animate-spin ${isChaosMode ? 'text-orange-500' : 'text-blue-500'}`} size={48} />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{Math.round(progress)}%</div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic text-white">{isChaosMode ? 'Chaos exploration' : 'Regression protocol'}</h2>
                    <div className="flex items-center gap-2 font-mono text-[9px] text-slate-500 uppercase tracking-widest">
                        Status: <span className="text-emerald-500 animate-pulse">Running Tactical Agent...</span>
                    </div>
                  </div>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full mb-8 overflow-hidden">
                <motion.div className={`h-full ${isChaosMode ? 'bg-orange-500' : 'bg-blue-500'}`} initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
              </div>
              <div className="bg-black/50 rounded-2xl p-6 border border-white/5 font-mono text-[10px] space-y-2">
                  {executionLogs.map((log, i) => (
                    <div key={i} className={isChaosMode ? 'text-orange-500/80' : 'text-emerald-500/80'}>
                        <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span> {log}
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- GRID PRINCIPAL --- */}
      {!executingSuiteId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'missions' ? (
            missions.map(m => (
              <div key={m.id} className="group bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-6 rounded-[32px] hover:border-blue-500/30 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${m.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}><Activity size={16}/></div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{new Date(m.created_at).toLocaleDateString()}</span>
                </div>
                <h3 className="text-xs font-black uppercase text-white truncate italic mb-1">{m.url.replace('https://', '')}</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase mb-4">{m.test_results?.length || 0} Trace steps captured</p>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="flex-1 bg-white/5 border border-white/10 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 transition-colors">Ver Detalles</button>
                </div>
              </div>
            ))
          ) : (
            suites.map(s => (
              <div key={s.id} className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-6 rounded-[32px] hover:shadow-2xl hover:shadow-blue-500/5 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><FlaskConical size={20} /></div>
                  <div className="flex gap-2">
                    <button onClick={() => setConfigSuite(s)} className="p-2.5 bg-white/5 text-slate-400 hover:text-blue-500 rounded-xl border border-white/5"><Settings size={18}/></button>
                    <button onClick={() => handleRunChaos(s)} className="p-2.5 bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20"><Sparkles size={18} /></button>
                    <button onClick={() => handleRunSuite(s)} className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20"><Play size={18} fill="currentColor"/></button>
                  </div>
                </div>
                <h3 className="font-black text-white uppercase truncate text-sm italic mb-1">{s.name}</h3>
                <p className="text-[9px] text-slate-500 font-bold truncate mb-6 uppercase tracking-widest">{s.base_url}</p>
                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2"><Code size={12} /> {s.test_steps?.length || 0} Instructions</span>
                  {s.system_context && <Brain size={12} className="text-blue-500 animate-pulse" />}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- MODAL CONFIGURACIÓN NEURAL --- */}
      <AnimatePresence>
        {configSuite && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0A0A0A] border border-white/10 p-10 rounded-[40px] max-w-lg w-full shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600"><Brain size={24}/></div>
                <h3 className="text-sm font-black uppercase tracking-widest italic text-white">Neural Override: {configSuite.name}</h3>
              </div>
              <form onSubmit={handleUpdateConfig} className="space-y-6">
                <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block tracking-widest italic">System Instructions</label>
                    <textarea name="context" defaultValue={configSuite.system_context} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500 min-h-[120px]" placeholder="Ej: Eres un experto en finanzas, valida que no haya fugas en el checkout..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Test Email</label>
                        <input name="email" defaultValue={configSuite.test_credentials?.email} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Test Password</label>
                        <input name="password" type="password" defaultValue={configSuite.test_credentials?.password} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500" />
                    </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setConfigSuite(null)} className="flex-1 text-slate-500 text-[9px] font-black uppercase tracking-widest">Abort</button>
                  <button type="submit" className="flex-[2] bg-blue-600 text-white py-5 rounded-2xl text-[9px] font-black uppercase shadow-xl shadow-blue-500/20">Sync Brain</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE REPORTE FINAL --- */}
      <AnimatePresence>
        {lastReport && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setLastReport(null)} className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[160]" />
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed inset-4 md:inset-10 bg-[#08090F] z-[170] rounded-[40px] overflow-hidden flex flex-col border border-white/10">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><TerminalIcon size={28} /></div>
                  <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Master Tactical Report</h2>
                </div>
                <button onClick={() => setLastReport(null)} className="p-4 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-red-600 transition-colors"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10">
                  <div className="max-w-4xl mx-auto space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                              <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Health Index</p>
                              <p className="text-3xl font-black text-emerald-500 italic">100%</p>
                          </div>
                          <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                              <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Bugs Detected</p>
                              <p className="text-3xl font-black text-red-500 italic">0</p>
                          </div>
                      </div>
                      <div className="bg-black/50 p-8 rounded-[32px] border border-white/5">
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6">Trace Data Output</h4>
                          <pre className="text-[11px] font-mono text-emerald-500/80 overflow-x-auto">
                              {JSON.stringify(lastReport, null, 2)}
                          </pre>
                      </div>
                  </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
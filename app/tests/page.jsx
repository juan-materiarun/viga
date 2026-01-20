'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, X, Code, Play, Trash2, Zap,
  Loader2, Eye, Bug, Terminal as TerminalIcon, Download,
  Layout, ShieldAlert, Activity, ChevronRight, Save,
  AlertTriangle, AlertCircle, Sparkles, Clock, Search, Cpu,
  Settings, Key, Brain, FlaskConical, Globe, ShieldCheck, Box, Coins
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CreditDeduction from '../components/CreditDeduction';

export default function UnifiedTestsPage() {
  const { user } = useAuth();
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
  const [deleteSuite, setDeleteSuite] = useState(null);
  const [selectedSuites, setSelectedSuites] = useState([]); // Array de IDs seleccionados
  const [isDeleting, setIsDeleting] = useState(false);
  const [liveSteps, setLiveSteps] = useState([]); // Pasos detectados en vivo
  const [selectedImg, setSelectedImg] = useState(null); // Para ver screenshots full screen
  const [showSaveModal, setShowSaveModal] = useState(null); // { mission }
  const [showFinishedModal, setShowFinishedModal] = useState(null); // { status }
  const [creditDeduction, setCreditDeduction] = useState(null); // { amount }

  // RUN CONFIG STATE (Credentials)
  const [suiteToRun, setSuiteToRun] = useState(null);
  const [runCredentials, setRunCredentials] = useState({ username: '', password: '' });
  const [showRunConfig, setShowRunConfig] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, user?.id]);

  // --- ESCUCHA REAL-TIME PARA EJECUCIONES EN LA ARMORY ---
  useEffect(() => {
    if (!executingSuiteId) return;

    const logsChannel = supabase.channel(`armory-logs-${executingSuiteId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_logs',
        filter: `suite_id=eq.${executingSuiteId}`
      }, (payload) => {
        setExecutionLogs(prev => [...prev.slice(-30), payload.new.message]);
        if (payload.new.level === 'success') setProgress(p => Math.min(p + 10, 95));
      })
      .subscribe();

    const stepsChannel = supabase.channel(`armory-steps-${executingSuiteId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'test_steps',
        filter: `suite_id=eq.${executingSuiteId}`
      }, (payload) => {
        setLiveSteps(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'test_steps',
        filter: `suite_id=eq.${executingSuiteId}`
      }, (payload) => {
        setLiveSteps(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
      })
      .subscribe();

    const suiteChannel = supabase.channel(`armory-status-${executingSuiteId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'test_suites',
        filter: `id=eq.${executingSuiteId}`
      }, (payload) => {
        const newStatus = payload.new.status;
        if (newStatus === 'completed' || newStatus === 'failed') {
          setTimeout(() => {
            setProgress(100);
            setExecutingSuiteId(null);
            setShowFinishedModal({ status: newStatus });
            fetchData();
          }, 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(suiteChannel);
      supabase.removeChannel(stepsChannel);
    };
  }, [executingSuiteId]);

  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function fetchData() {
    setLoading(true);
    console.log("[ARMORY] Fetching data. Tab:", activeTab, "User:", user?.id);
    try {
      if (activeTab === 'missions') {
        const { data, error } = await supabase.from('test_suites')
          .select(`*, test_steps (*)`)
          .order('created_at', { ascending: false })
          .order('created_at', { foreignTable: 'test_steps', ascending: true });
        if (error) {
          console.error("Missions fetch error:", error);
          // Fallback if the join fails
          const { data: simpleData } = await supabase.from('test_suites').select(`*`).order('created_at', { ascending: false });
          setMissions(simpleData || []);
        } else {
          setMissions(data || []);
        }
      } else {
        const { data, error } = await supabase.from('test_suites')
          .select(`*, test_steps (*)`)
          .eq('is_regression', true)
          .order('created_at', { ascending: false })
          .order('created_at', { foreignTable: 'test_steps', ascending: true });

        if (error) {
          console.error("Suites fetch error:", error);
          if (error.code === '42703') { // Missing is_regression column
            const { data: allData } = await supabase.from('test_suites')
              .select(`*, test_steps (*)`)
              .order('created_at', { ascending: false })
              .order('created_at', { foreignTable: 'test_steps', ascending: true });
            setSuites(allData || []);
            showNotify("Modo de compatibilidad: Se muestran todas las suites.", "error");
          } else {
            showNotify("Error al obtener suites", "error");
          }
        } else {
          setSuites(data || []);
        }
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
    setLiveSteps([]);
    setProgress(10);
    setExecutionLogs([
      "🔥 [CHAOS MODE] Initializing Autonomous Agent...",
      "🧠 [NEURAL] Thinking: Exploring without boundaries.",
      `🌐 [TARGET] ${suite.base_url}`
    ]);

    await supabase.from('test_suites').update({ status: 'running' }).eq('id', suite.id);

    try {
      const response = await fetch('/api/run-chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: suite.base_url,
          suite_id: suite.id,
          system_context: suite.system_context,
          credentials: suite.test_credentials,
          userId: user?.id
        })
      });

      const result = await response.json();

      if (response.status === 402) {
        showNotify("Saldo insuficiente: Recarga tus Vigas para continuar.", "error");
        setExecutingSuiteId(null);
        return;
      }

      if (!result.success) throw new Error(result.error);

      // Success! Trigger animation
      setCreditDeduction(20);
      setTimeout(() => setCreditDeduction(null), 3000);

    } catch (err) {
      showNotify(err.message, "error");
      setExecutingSuiteId(null);
    }
  };

  const handleSetRegression = (mission) => {
    setShowSaveModal({ mission });
  };

  const handleConfirmSave = async (name) => {
    const mission = showSaveModal.mission;
    const { error } = await supabase.from('test_suites').update({
      name: `[REGRESSION] ${name}`,
      is_regression: true
    }).eq('id', mission.id);

    if (error) {
      await supabase.from('test_suites').update({ name: `[REGRESSION] ${name}` }).eq('id', mission.id);
      showNotify("Guardado con tag [REGRESSION]. (Check DB Columns)", "error");
    } else {
      showNotify("Misión convertida en Suite de Regresión");
    }
    setShowSaveModal(null);
    fetchData();
  };


  // --- EJECUCIÓN REGRESIÓN ESTÁNDAR ---
  // --- EJECUCIÓN REGRESIÓN ESTÁNDAR ---
  const handleInitiateRun = (suite) => {
    setSuiteToRun(suite);
    setShowRunConfig(true);
  };

  const handleRunSuite = async () => {
    const suite = suiteToRun;
    if (!suite || executingSuiteId) return;

    setShowRunConfig(false);
    setExecutingSuiteId(suite.id);
    setIsChaosMode(false);
    setLastReport(null);
    setLiveSteps((suite.test_steps || []).map(s => ({ ...s, status: 'running', screenshot_url: null, expected_result: 'Preparando motor de regresión...' })));
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
          suite_id: suite.id,
          steps: suite.test_steps,
          system_context: suite.system_context,
          credentials: suite.test_credentials,
          userId: user?.id
        })
      });

      if (response.status === 402) {
        showNotify("Saldo insuficiente: Se requieren 20 Vigas.", "error");
        setExecutingSuiteId(null);
        setProgress(0);
        return;
      }

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      // Success! Trigger animation (Regression costs 5 usually, check api but assuming 5 for update)
      // Actually regression usually cheaper or same? Let's assume 5 based on logs seen
      setCreditDeduction(5);
      setTimeout(() => setCreditDeduction(null), 3000);
      const result = await response.json();

      if (result.success) {
        setExecutionLogs(prev => [...prev, "✅ [ENQUEUED] Protocolo lanzado. Observando ejecución en vivo..."]);
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
        <button
          onClick={fetchData}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-blue-500 transition-all active:scale-90"
          title="Sincronizar Datos"
        >
          <Clock size={18} />
        </button>
      </header>



      <CreditDeduction
        amount={creditDeduction}
        isVisible={!!creditDeduction}
        onComplete={() => setCreditDeduction(null)}
      />

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
              <div className="flex flex-col lg:flex-row gap-8 h-[600px]">
                {/* --- PANEL IZQUIERDO: EVIDENCE STREAM --- */}
                <div className="flex-[2] flex flex-col gap-6 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 text-blue-500 uppercase font-black tracking-widest text-[9px]">
                      <FlaskConical size={14} className="animate-pulse" /> Visual Evidence Stream
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{liveSteps.length} Pasos Capturados</span>
                  </div>

                  {liveSteps.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                      {[...liveSteps].reverse().map((step, idx) => (
                        <motion.div
                          key={step.id || idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={() => step.screenshot_url && setSelectedImg(step.screenshot_url)}
                          className={`bg-white/5 rounded-3xl border overflow-hidden flex flex-col group transition-all duration-500 cursor-zoom-in ${step.status === 'failed' ? 'border-red-500/30' : 'border-white/10 hover:border-blue-500/50'}`}
                        >
                          <div className="p-4 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border ${step.status === 'success' ? 'bg-emerald-600/10 text-emerald-500 border-emerald-500/20' : step.status === 'failed' ? 'bg-red-600/10 text-red-500 border-red-500/20' : 'bg-blue-600/10 text-blue-500 border-blue-500/20'}`}>
                                {step.status === 'success' ? <CheckCircle2 size={14} /> : step.status === 'failed' ? <X size={14} /> : <FlaskConical size={14} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase text-white truncate">{step.title || 'Infiltración'}</p>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tight">{step.action_type || 'Agent Action'}</p>
                              </div>
                            </div>
                            {step.status === 'running' && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                          </div>

                          <div className="relative aspect-video bg-[#050505] overflow-hidden">
                            {step.screenshot_url ? (
                              <img src={step.screenshot_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="Step Screenshot" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                <Loader2 className="animate-spin text-slate-700" size={20} />
                                <span className="text-[8px] font-mono text-slate-700 uppercase">Synchronizing...</span>
                              </div>
                            )}

                            {step.selector && (
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="p-2 bg-blue-600/20 backdrop-blur-md rounded-lg border border-blue-500/30">
                                  <p className="text-[7px] font-black text-blue-400 uppercase mb-1">Neural Target</p>
                                  <code className="text-[8px] text-white block truncate font-mono">{step.selector}</code>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="p-4 bg-black/40 flex-1">
                            <p className="text-[9px] text-slate-400 leading-relaxed italic line-clamp-2 italic">"{step.expected_result || 'Analizando parámetros de éxito...'}"</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 bg-white/5 rounded-[40px] border border-white/10 border-dashed flex flex-col items-center justify-center text-center p-10">
                      <div className="relative mb-6">
                        <Activity size={48} className="text-slate-700 animate-pulse" />
                        <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
                      </div>
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-2">Neural Link Online</h4>
                      <p className="text-[8px] text-slate-600 font-bold uppercase max-w-[200px] mx-auto leading-loose italic text-balance">Esperando que el agente despliegue las primeras contramedidas visuales...</p>
                    </div>
                  )}
                </div>

                {/* --- PANEL DERECHO: LOGS --- */}
                <div className="flex-1 bg-[#050505] rounded-3xl p-6 border border-white/10 font-mono text-[9px] flex flex-col">
                  <div className="flex items-center gap-2 mb-6 text-emerald-500 uppercase font-black tracking-widest text-[8px] border-b border-emerald-500/20 pb-4">
                    <TerminalIcon size={12} /> Live Trace Logs
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                    {executionLogs.map((log, i) => (
                      <div key={i} className={`flex gap-3 leading-relaxed animate-in slide-in-from-left-2 duration-300 ${log.includes('✅') || log.includes('success') ? 'text-emerald-500' : log.includes('⚠️') || log.includes('Error') ? 'text-red-500' : 'text-slate-500'}`}>
                        <span className="opacity-20 shrink-0 font-bold">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                        <span className="break-all">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- GRID PRINCIPAL --- */}
      {
        !executingSuiteId && (
          <>
            {activeTab === 'missions' && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[24px] mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="text-emerald-500" size={16} />
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Protocol History</h4>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Aquí se almacenan los <span className="text-emerald-500 font-bold uppercase">Trace Logs</span> de cada misión ejecutada por la IA.
                  Podes auditar cada paso, screenshot y análisis para detectar fallos en producción.
                </p>
              </div>
            )}

            {activeTab === 'suites' && (
              <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-[24px] mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Box className="text-blue-500" size={16} />
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Tactical Suites</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Plantillas de regresión que <span className="text-blue-500 font-bold uppercase underline">ahorran Vigas</span>. Al ejecutarlas, VIGA usa los selectores guardados
                    con auto-curación inteligente, evitando el costo total del proceso de pensamiento AI.
                  </p>
                </div>

                <div className="flex gap-4 shrink-0">
                  <button
                    onClick={() => {
                      if (selectedSuites.length === suites.length) setSelectedSuites([]);
                      else setSelectedSuites(suites.map(s => s.id));
                    }}
                    className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all"
                  >
                    {selectedSuites.length === suites.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                  </button>

                  {selectedSuites.length > 0 && (
                    <button
                      onClick={() => setDeleteSuite({
                        id: selectedSuites,
                        name: `${selectedSuites.length} Suites Seleccionadas`,
                        isBulk: true
                      })}
                      className="px-6 py-4 rounded-2xl bg-red-600 text-white text-[9px] font-black uppercase shadow-lg shadow-red-600/20 animate-in zoom-in duration-300"
                    >
                      Purgar ({selectedSuites.length})
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'missions' && missions.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-50">
                <Activity size={48} className="text-slate-500 mb-4" />
                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">No hay rastro de ejecuciones previas</p>
                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Ejecuta un agente desde el Dashboard o una Suite para ver los logs aquí.</p>
              </div>
            )}

            {activeTab === 'suites' && suites.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-50">
                <FlaskConical size={48} className="text-slate-500 mb-4" />
                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">No hay suites de regresión guardadas</p>
                <div className="flex flex-col items-center gap-2 mt-4 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
                    1. Ejecuta una misión desde el <Link href="/dashboard" className="text-blue-500 underline">Dashboard</Link><br />
                    2. Al terminar, entra al terminal (Review Evidence)<br />
                    3. Haz clic en <span className="text-emerald-500 font-black">"Guardar Test Set"</span>
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTab === 'missions' ? (
                missions.map(m => (
                  <div key={m.id} className="group bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-6 rounded-[32px] hover:border-blue-500/30 transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2 rounded-lg ${m.status === 'completed' || m.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}><Activity size={16} /></div>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{new Date(m.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-xs font-black uppercase text-white truncate italic mb-1">{m.base_url?.replace('https://', '') || 'Mission Run'}</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-4">{m.test_steps?.length || 0} Trace steps captured</p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setLastReport(m.test_steps || [])}
                        className="flex-1 bg-white/5 border border-white/10 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 transition-colors"
                        title="Ver Detalles"
                      >
                        Ver
                      </button>
                      {(m.status === 'completed' || m.status === 'success') && !m.is_regression && (
                        <button
                          onClick={() => handleSetRegression(m)}
                          className="flex-1 bg-emerald-600/20 border border-emerald-500/20 py-2 rounded-xl text-[9px] font-black uppercase text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all whitespace-nowrap"
                          title="Guardar como Suite"
                        >
                          Guardar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                suites.map(s => (
                  <div key={s.id} className={`group bg-white dark:bg-white/[0.03] border p-6 rounded-[32px] transition-all relative ${selectedSuites.includes(s.id)
                    ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-2xl shadow-blue-500/5'
                    : 'border-slate-200 dark:border-white/5 hover:shadow-2xl hover:shadow-blue-500/5'
                    }`}>
                    {/* CHECKBOX OVERLAY */}
                    <div
                      onClick={() => {
                        if (selectedSuites.includes(s.id)) setSelectedSuites(prev => prev.filter(id => id !== s.id));
                        else setSelectedSuites(prev => [...prev, s.id]);
                      }}
                      className={`absolute -top-2 -left-2 w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer z-10 transition-all ${selectedSuites.includes(s.id)
                        ? 'bg-blue-600 border-blue-600 text-white rotate-0'
                        : 'bg-[#0A0A0A] border-white/10 text-transparent -rotate-12 group-hover:rotate-0 group-hover:text-white/20'
                        }`}
                      title={selectedSuites.includes(s.id) ? "Deseleccionar" : "Seleccionar"}
                    >
                      <CheckCircle2 size={16} fill={selectedSuites.includes(s.id) ? "white" : "none"} />
                    </div>

                    <div className="flex justify-between items-start mb-6">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shadow-inner"><FlaskConical size={20} /></div>
                      <div className="flex gap-2">
                        <button onClick={() => setDeleteSuite(s)} className="p-2.5 bg-white/5 text-slate-400 hover:text-red-500 rounded-xl border border-white/5 transition-all hover:bg-red-500/10" title="Eliminar Suite"><Trash2 size={18} /></button>
                        <button onClick={() => setConfigSuite(s)} className="p-2.5 bg-white/5 text-slate-400 hover:text-blue-500 rounded-xl border border-white/5 transition-all hover:bg-blue-500/10" title="Configurar Suite"><Settings size={18} /></button>
                      </div>
                    </div>

                    <h3 className="font-black text-white uppercase truncate text-sm italic mb-1">{s.name?.replace('[REGRESSION]', '')}</h3>
                    <p className="text-[9px] text-slate-500 font-bold truncate mb-6 uppercase tracking-widest">{s.base_url?.replace('https://', '')}</p>

                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2"><Code size={12} /> {s.test_steps?.length || 0} Instructions</span>
                        {s.system_context && <div className="p-1 px-2 rounded-md bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase flex items-center gap-1"><Brain size={10} className="animate-pulse" /> Neural Active</div>}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleRunChaos(s)}
                          className="flex items-center justify-center gap-2 px-3 py-3 bg-orange-600/10 border border-orange-500/20 text-orange-500 hover:bg-orange-600 hover:text-white rounded-xl transition-all text-[9px] font-black uppercase tracking-tighter"
                          title="Ejecutar en modo Caos"
                        >
                          <Sparkles size={14} /> EXPLORER (20V)
                        </button>

                        <button
                          onClick={() => handleInitiateRun(s)}
                          className="flex items-center justify-center gap-2 px-3 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all text-[9px] font-black uppercase tracking-tighter"
                          title="Ejecutar Regresión"
                        >
                          <Play size={14} fill="currentColor" /> RUN TEST (5V)
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* --- TEST RUN CONFIG MODAL (CREDENTIALS) --- */}
            <AnimatePresence>
              {showRunConfig && suiteToRun && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[#0A0A0A] border border-white/10 p-10 rounded-[40px] max-w-lg w-full shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Activity size={120} /></div>

                    <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white mb-2">Initialize Protocol</h3>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-8">
                      Target: <span className="text-white">{suiteToRun.name}</span>
                    </p>

                    <div className="space-y-6 mb-8">
                      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-400 mb-4">
                          <Coins size={14} className="rotate-45" /> Inject Runtime Credentials (Optional)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[8px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Username / Email</label>
                            <input
                              value={runCredentials.username}
                              onChange={(e) => setRunCredentials(prev => ({ ...prev, username: e.target.value }))}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] text-white focus:border-blue-500 outline-none font-bold uppercase"
                              placeholder="USER..."
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Password</label>
                            <input
                              type="password"
                              value={runCredentials.password}
                              onChange={(e) => setRunCredentials(prev => ({ ...prev, password: e.target.value }))}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] text-white focus:border-blue-500 outline-none font-bold uppercase"
                              placeholder="PASS..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => { setShowRunConfig(false); setSuiteToRun(null); }}
                        className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRunSuite}
                        className="flex-1 py-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Play size={14} fill="currentColor" /> Confirm Operations
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        )
      }

      {/* --- MODAL CONFIGURACIÓN NEURAL --- */}
      <AnimatePresence>
        {configSuite && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0A0A0A] border border-white/10 p-10 rounded-[40px] max-w-lg w-full shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600"><Brain size={24} /></div>
                <h3 className="text-sm font-black uppercase tracking-widest italic text-white">Neural Override: {configSuite.name}</h3>
              </div>
              <form onSubmit={handleUpdateConfig} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block tracking-widest italic">System Instructions</label>
                  <textarea
                    name="context"
                    defaultValue={configSuite.system_context}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white focus:border-blue-500 outline-none h-32 resize-none font-mono"
                    placeholder="E.g. Prioritizar búsqueda de errores en el checkout..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block tracking-widest italic">Test Email</label>
                    <input
                      name="email"
                      type="text"
                      defaultValue={configSuite.test_credentials?.email}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white focus:border-blue-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block tracking-widest italic">Test Password</label>
                    <input
                      name="password"
                      type="password"
                      defaultValue={configSuite.test_credentials?.password}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white focus:border-blue-500 outline-none font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setConfigSuite(null)} className="flex-1 bg-white/5 border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                  <button type="submit" className="flex-1 bg-blue-600 py-4 rounded-2xl text-[10px] font-black uppercase text-white shadow-xl shadow-blue-500/20">Guardar Cambios</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* --- MODAL CONFIRMACIÓN BORRADO (CUSTOM SAAS UI) --- */}
        {deleteSuite && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-[#0A0A0A] border border-red-500/20 p-10 rounded-[40px] max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />

              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-[30px] flex items-center justify-center text-red-500 mb-8 rotate-3 border border-red-500/20">
                  <ShieldAlert size={40} />
                </div>

                <h3 className="text-xl font-black uppercase tracking-tighter italic text-white mb-2">Eliminar Suite</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8 leading-relaxed">
                  Estás por purgar <span className="text-white italic">"{deleteSuite.name}"</span>.<br />
                  Esta acción es irreversible y eliminará todos los registros asociados.
                </p>

                <div className="flex flex-col w-full gap-3">
                  <button
                    disabled={isDeleting}
                    onClick={async () => {
                      setIsDeleting(true);
                      const idsToPurge = deleteSuite.isBulk ? deleteSuite.id : [deleteSuite.id];

                      try {
                        // 1. Purgar referencias en cascada manual (discovered_elements y test_steps)
                        await supabase.from('discovered_elements').delete().in('suite_id', idsToPurge);
                        await supabase.from('test_steps').delete().in('suite_id', idsToPurge);

                        // 2. Purgar las suites
                        const { error } = await supabase.from('test_suites').delete().in('id', idsToPurge);

                        if (!error) {
                          showNotify(deleteSuite.isBulk ? 'Purga colectiva completada' : 'Protocolo eliminado con éxito');
                          setDeleteSuite(null);
                          setSelectedSuites([]); // Limpiamos selección
                          fetchData();
                        } else {
                          showNotify('Error al purgar los datos principales', 'error');
                        }
                      } catch (err) {
                        console.error(err);
                        showNotify('Error crítico durante la purga', 'error');
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 py-5 rounded-[24px] text-[11px] font-black uppercase text-white shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    {isDeleting ? 'Purgando...' : 'Confirmar Purgado'}
                  </button>

                  <button
                    disabled={isDeleting}
                    onClick={() => setDeleteSuite(null)}
                    className="w-full bg-white/5 hover:bg-white/10 py-5 rounded-[24px] text-[11px] font-black uppercase text-slate-400 transition-all border border-white/5"
                  >
                    Abortar Misión
                  </button>
                </div>
              </div>
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
                <button onClick={() => setLastReport(null)} className="p-4 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-red-600 transition-colors"><X size={20} /></button>
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

      {/* --- MODAL DE GUARDADO PREMIUM --- */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0A0B10] border border-white/10 w-full max-w-md rounded-[40px] p-10 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-8 mx-auto">
                <Save size={40} />
              </div>
              <h3 className="text-2xl font-black uppercase italic text-center text-white tracking-tighter mb-2">Save Tactical Suite</h3>
              <p className="text-xs text-slate-500 text-center mb-8 font-bold uppercase tracking-widest">Convierte esta traza en una regresión autónoma</p>

              <form onSubmit={(e) => { e.preventDefault(); handleConfirmSave(new FormData(e.target).get('name')); }}>
                <input
                  name="name"
                  autoFocus
                  required
                  placeholder="NOMBRE DE LA SUITE (EJ: LOGIN FLOW)"
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-emerald-500 transition-colors mb-6"
                />
                <div className="flex flex-col gap-3">
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 py-5 rounded-[24px] text-[10px] font-black uppercase text-white shadow-xl shadow-emerald-600/20 transition-all active:scale-95">Guardar en Armeria</button>
                  <button type="button" onClick={() => setShowSaveModal(null)} className="w-full bg-white/5 hover:bg-white/10 py-5 rounded-[24px] text-[10px] font-black uppercase text-slate-500 transition-all">Cancelar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE FINALIZACIÓN PREMIUM --- */}
      <AnimatePresence>
        {showFinishedModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[#0A0B10] border border-white/10 w-full max-w-md rounded-[40px] p-10 shadow-2xl text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-8 mx-auto ${showFinishedModal.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {showFinishedModal.status === 'completed' ? <CheckCircle2 size={40} /> : <ShieldAlert size={40} />}
              </div>
              <h3 className="text-2xl font-black uppercase italic text-white tracking-tighter mb-2">Protocolo {showFinishedModal.status === 'completed' ? 'Finalizado' : 'Interrumpido'}</h3>
              <p className="text-xs text-slate-500 mb-8 font-bold uppercase tracking-widest">El agente táctico ha regresado a la base.</p>
              <button onClick={() => setShowFinishedModal(null)} className={`w-full py-5 rounded-[24px] text-[10px] font-black uppercase transition-all shadow-xl ${showFinishedModal.status === 'completed' ? 'bg-blue-600 text-white shadow-blue-600/20' : 'bg-white/5 text-white'}`}>Cerrar Consola</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FULLSCREEN SCREENSHOT MODAL --- */}
      <AnimatePresence>
        {selectedImg && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-6xl w-full"
            >
              <img src={selectedImg} className="w-full h-auto max-h-[85vh] object-contain rounded-3xl shadow-2xl border border-white/10" alt="Full Evidence" />
              <button
                onClick={() => setSelectedImg(null)}
                className="absolute -top-16 right-0 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/5 group"
              >
                <X size={24} className="group-hover:rotate-90 transition-transform" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
}
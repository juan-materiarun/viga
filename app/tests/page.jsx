'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Clock, Beaker, X, Code, Play, Trash2, Zap, 
  Loader2, Eye, Bug, Terminal as TerminalIcon, Download, 
  Layout, ShieldAlert, Activity, ExternalLink, Globe, ChevronRight, Save, 
  AlertTriangle, AlertCircle, Info
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

export default function UnifiedTestsPage() {
  const [activeTab, setActiveTab] = useState('missions');
  const [missions, setMissions] = useState([]);
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState(null);
  const [isSavingSuite, setIsSavingSuite] = useState(false);
  const [executingSuiteId, setExecutingSuiteId] = useState(null);
  const [lastReport, setLastReport] = useState(null); 
  const [executionLogs, setExecutionLogs] = useState([]);

  // --- ESTADOS PARA MODALES PERSONALIZADOS (SAAS UI) ---
  const [notification, setNotification] = useState(null); 
  const [confirmModal, setConfirmModal] = useState(null); 
  const [customPrompt, setCustomPrompt] = useState(null); 

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Sistema de notificaciones tipo Toast
  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'missions') {
        const { data } = await supabase
          .from('missions')
          .select(`*, test_results (*)`)
          .order('created_at', { ascending: false });
        setMissions(data || []);
      } else {
        const { data } = await supabase
          .from('test_suites')
          .select(`*, test_steps (*)`)
          .order('created_at', { ascending: false });
        setSuites(data || []);
      }
    } catch (err) {
      showNotify("Error de sincronización con Supabase", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleRunSuite = async (suite) => {
    if (executingSuiteId) return; 

    setExecutingSuiteId(suite.id);
    setLastReport(null); 
    setExecutionLogs([
      "🚀 [SYSTEM] Initializing VIGA Master Engine...", 
      "🛡️ [MODE] Headless Stealth Mode Active",
      `🌐 [BROWSER] Target: ${suite.base_url}`
    ]);
    
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
        abortController.abort();
        setExecutionLogs(prev => [...prev, "❌ [TIMEOUT] Engine is not responding."]);
        setExecutingSuiteId(null);
        showNotify("Error: Tiempo de espera agotado", "error");
    }, 60000); 

    try {
      const orderedSteps = suite.test_steps?.sort((a, b) => a.step_order - b.step_order);
      
      const response = await fetch('/api/run-viga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: suite.base_url,
          steps: orderedSteps 
        }),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      
      if (result.success) {
        setExecutionLogs(prev => [...prev, "✅ [SUCCESS] Master Report Generated."]);
        setTimeout(() => {
          setLastReport(result.data);
          setExecutingSuiteId(null);
          showNotify("Prueba finalizada con éxito");
        }, 800);
      } else {
        showNotify(result.error || "Fallo en la ejecución", "error");
        setExecutingSuiteId(null);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      showNotify("Fallo crítico en el motor", "error");
      setExecutingSuiteId(null);
    }
  };

  const downloadReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lastReport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `viga_report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showNotify("Reporte exportado");
  };

  const handleSaveToSuite = (mission) => {
    if (!mission.test_results?.length) return showNotify("Sin resultados para guardar", "error");
    
    setCustomPrompt({
      title: "Asignar nombre a la Suite",
      defaultValue: `${mission.url.replace('https://', '')} - Regression`,
      onConfirm: async (suiteName) => {
        if (!suiteName) return;
        setIsSavingSuite(true);
        try {
          const { data: suite, error: sError } = await supabase
            .from('test_suites')
            .insert([{ name: suiteName, base_url: mission.url }])
            .select().single();

          if (sError) throw sError;

          const steps = mission.test_results.map((res, index) => ({
            suite_id: suite.id,
            action_type: res.action || 'click',
            selector: res.decided_value || res.selector,
            dna_html: res.dna?.fullHtml || res.html_context || null,
            step_order: index,
            expected_result: res.title || res.objective || "Action Element"
          }));

          const { error: stepsError } = await supabase.from('test_steps').insert(steps);
          if (stepsError) throw stepsError;

          showNotify("Suite Regression Creada");
          setActiveTab('suites');
          fetchData();
        } catch (err) {
          showNotify("Error al guardar en base de datos", "error");
        } finally {
          setIsSavingSuite(false);
          setSelectedMission(null);
          setCustomPrompt(null);
        }
      }
    });
  };

  const handleDeleteSuite = (id) => {
    setConfirmModal({
      title: "¿Estás seguro de eliminar esta Suite?",
      onConfirm: async () => {
        const { error } = await supabase.from('test_suites').delete().eq('id', id);
        if (!error) {
          showNotify("Suite eliminada satisfactoriamente");
          fetchData();
        } else {
          showNotify("Error al eliminar", "error");
        }
        setConfirmModal(null);
      }
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto pb-40 min-h-screen bg-[#F8FAFC] dark:bg-[#030303] transition-colors duration-500">
      
      {/* --- TOAST NOTIFICATIONS --- */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
          >
            <div className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${
              notification.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
            }`}>
              {notification.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
              <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL CONFIRMACIÓN --- */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/10 p-8 rounded-[32px] max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white mb-8">{confirmModal.title}</h3>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(null)} className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">Cancelar</button>
                <button onClick={confirmModal.onConfirm} className="flex-1 bg-red-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-red-500/20">Eliminar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL PROMPT (INPUT) --- */}
      <AnimatePresence>
        {customPrompt && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCustomPrompt(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/10 p-8 rounded-[32px] max-w-md w-full shadow-2xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-6 italic">{customPrompt.title}</h3>
              <input 
                autoFocus
                id="prompt-input-suite"
                defaultValue={customPrompt.defaultValue}
                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 mb-8"
                onKeyDown={(e) => e.key === 'Enter' && customPrompt.onConfirm(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setCustomPrompt(null)} className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">Descartar</button>
                <button onClick={() => customPrompt.onConfirm(document.getElementById('prompt-input-suite').value)} className="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-blue-500/20">Guardar Suite</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Zap size={20} fill="currentColor" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-white transition-colors">VIGA ENGINE</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Autonomous QA System</p>
        </div>

        <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
          <button onClick={() => setActiveTab('missions')} className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'missions' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
            Missions
          </button>
          <button onClick={() => setActiveTab('suites')} className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'suites' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>
            Suites
          </button>
        </div>
      </header>

      {/* TERMINAL DE LOGS */}
      <AnimatePresence>
        {executingSuiteId && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-8">
            <div className="bg-slate-900 rounded-2xl p-6 font-mono text-xs border border-slate-800 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <TerminalIcon size={14} className="text-blue-400" />
                <span className="text-slate-500 font-bold uppercase tracking-widest">Engine Live Trace</span>
              </div>
              <div className="space-y-1.5">
                {executionLogs.map((log, i) => (
                  <div key={i} className={log.includes('✅') ? 'text-emerald-400' : log.includes('❌') ? 'text-red-400' : 'text-slate-300'}>
                    <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-slate-400 font-black uppercase text-xs tracking-widest">Syncing...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'missions' ? (
            missions.map(m => (
              <div key={m.id} onClick={() => setSelectedMission(m)} className="group bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-6 rounded-3xl hover:border-blue-500/50 transition-all cursor-pointer shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${m.status === 'success' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white truncate">{m.url.replace('https://', '')}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{m.test_results?.length || 0} Trace Points</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            ))
          ) : (
            suites.map(s => (
              <div key={s.id} className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <Layout size={20} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRunSuite(s)} disabled={!!executingSuiteId} className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all disabled:opacity-20">
                      {executingSuiteId === s.id ? <Loader2 className="animate-spin" size={18}/> : <Play size={18} fill="currentColor"/>}
                    </button>
                    <button onClick={() => handleDeleteSuite(s.id)} className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-red-500 rounded-lg transition-all">
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase truncate text-sm">{s.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold truncate mb-4">{s.base_url}</p>
                <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Code size={12} /> {s.test_steps?.length || 0} Saved Steps
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL DETALLE DE MISIÓN */}
      <AnimatePresence>
        {selectedMission && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMission(null)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-white dark:bg-[#0A0A0A] border-l border-slate-200 dark:border-white/10 z-50 p-6 md:p-10 overflow-y-auto">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white flex items-center gap-2"><Eye size={20} className="text-blue-500"/> Trace Log</h2>
                <button onClick={() => setSelectedMission(null)} className="text-slate-400 hover:text-slate-900 transition-colors"><X /></button>
              </div>
              <div className="space-y-6 pb-20">
                {selectedMission.test_results?.map((res, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-blue-500 uppercase italic">Step {i+1}</span>
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 font-medium italic">"{res.reasoning}"</p>
                    <div className="bg-white dark:bg-black/50 p-4 rounded-xl border border-slate-200 dark:border-white/5 font-mono text-[9px] text-slate-500 overflow-hidden">
                      <div className="flex items-center gap-2 mb-2 text-blue-500 uppercase font-black"><Code size={12}/> {res.action}</div>
                      <div className="truncate text-slate-700 dark:text-blue-400/80 font-bold">TARGET: {res.title}</div>
                      <div className="truncate opacity-50 mt-1">SELECTOR: {res.decided_value || res.selector}</div>
                    </div>
                  </div>
                ))}
                <button onClick={() => handleSaveToSuite(selectedMission)} disabled={isSavingSuite} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50">
                  {isSavingSuite ? <Loader2 className="animate-spin" /> : <Save size={18}/>}
                  {isSavingSuite ? 'Syncing...' : 'Convert to Regression Suite'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* REPORTE MASTER FINAL */}
      <AnimatePresence>
        {lastReport && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLastReport(null)} className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60]" />
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed inset-4 md:inset-10 bg-white dark:bg-[#08090F] z-[70] rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/10">
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                    <ShieldAlert className="text-emerald-500" /> VIGA ANALYSIS
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{lastReport.url}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={downloadReport} className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-white hover:bg-slate-50 transition-all">
                    <Download size={20}/>
                  </button>
                  <button onClick={() => setLastReport(null)} className="p-3 bg-slate-900 text-white rounded-xl">
                    <X size={20}/>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
                <div className="flex-[1.5] p-6 bg-slate-100/50 dark:bg-black/20 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/5">
                  <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-white/5">
                    {lastReport.screenshotPath ? (
                       <img src={lastReport.screenshotPath} className="max-w-full h-auto max-h-[65vh] object-contain" alt="Test Result" />
                    ) : (
                      <div className="p-20 text-slate-400 font-black uppercase text-xs">No screenshot captured</div>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-6 md:p-8 space-y-8 bg-white dark:bg-[#080808]">
                  <section>
                    <h4 className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Bug size={14} /> Anomalies
                    </h4>
                    <div className="space-y-3">
                      {lastReport.vigaMasterReport?.criticalBugs?.length > 0 ? (
                        lastReport.vigaMasterReport.criticalBugs.map((bug, i) => (
                          <div key={i} className="p-4 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-xl">
                            <p className="text-xs font-black text-red-700 dark:text-red-400 uppercase mb-2">{bug.reason}</p>
                            <code className="text-[9px] font-mono break-all text-slate-500">{bug.selector}</code>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-xl text-center text-[10px] font-bold text-slate-400 uppercase italic">
                          No bugs detected.
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Activity size={14} /> System Health
                    </h4>
                    <div className="space-y-3">
                      {lastReport.vigaMasterReport?.functionalFailures?.map((fail, i) => (
                        <div key={i} className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-xl">
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{fail.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
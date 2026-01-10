'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Clock, Beaker, X, Code, Play, Trash2, Zap, 
  Loader2, Eye, Bug, Terminal as TerminalIcon, Download, 
  Layout, ShieldAlert, Activity, ExternalLink, Globe, ChevronRight, Save
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

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleRunSuite = async (suite) => {
    setExecutingSuiteId(suite.id);
    setExecutionLogs(["🚀 [SYSTEM] Initializing VIGA Master Engine...", `🌐 [BROWSER] Target: ${suite.base_url}`]);
    
    try {
      const orderedSteps = suite.test_steps?.sort((a, b) => a.step_order - b.step_order);
      
      const logsTimer = setInterval(() => {
        setExecutionLogs(prev => [...prev, `⚙️ [EXEC] Running step ${prev.length}...`, `🛡️ [SELF-HEALING] Scanning DOM signatures...`].slice(-5));
      }, 2500);

      const response = await fetch('/api/run-viga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: suite.base_url,
          steps: orderedSteps 
        }),
      });

      clearInterval(logsTimer);
      const result = await response.json();
      
      if (result.success) {
        setExecutionLogs(prev => [...prev, "✅ [SUCCESS] Analysis complete. Generating Master Report..."]);
        setTimeout(() => setLastReport(result.data), 1000);
      } else {
        alert("Error en el Runner: " + result.error);
      }
    } catch (err) {
      alert("Error de conexión con el motor.");
    } finally {
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
  };

  const handleSaveToSuite = async (mission) => {
    if (!mission.test_results?.length) return alert("No hay resultados.");
    setIsSavingSuite(true);
    const suiteName = prompt("Nombre de la Suite:", `${mission.url.replace('https://', '')} - Regression`);
    if (!suiteName) { setIsSavingSuite(false); return; }

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

      alert("¡Suite E2E Persistida!");
      setActiveTab('suites');
    } catch (err) {
      console.error(err);
      alert("Error al guardar la suite.");
    } finally {
      setIsSavingSuite(false);
      setSelectedMission(null);
    }
  };

  const handleDeleteSuite = async (id) => {
    if (!confirm("¿Eliminar esta suite permanentemente?")) return;
    const { error } = await supabase.from('test_suites').delete().eq('id', id);
    if (!error) fetchData();
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto pb-40 min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Zap size={20} fill="currentColor" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-white underline decoration-blue-500 transition-colors">VIGA ENGINE</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Autonomous QA & Self-Healing Regression System</p>
        </div>

        <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm w-fit">
          <button onClick={() => setActiveTab('missions')} className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'missions' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            Mission History
          </button>
          <button onClick={() => setActiveTab('suites')} className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'suites' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            E2E Suites
          </button>
        </div>
      </header>

      <AnimatePresence>
        {executingSuiteId && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-8 overflow-hidden">
            <div className="bg-slate-900 rounded-2xl p-6 font-mono text-sm border border-slate-800 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <TerminalIcon size={16} className="text-blue-400" />
                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Live Execution Trace</span>
              </div>
              <div className="space-y-2">
                {executionLogs.map((log, i) => (
                  <div key={i} className={log.includes('✅') ? 'text-emerald-400' : 'text-slate-300'}>
                    <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-slate-400 font-black uppercase text-xs tracking-widest">Syncing Intelligence...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'missions' ? (
            missions.map(m => (
              <div key={m.id} onClick={() => setSelectedMission(m)} className="group bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-6 rounded-3xl hover:border-blue-500/50 transition-all cursor-pointer shadow-sm hover:shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-3 h-3 rounded-full ${m.status === 'success' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white truncate max-w-[180px]">{m.url.replace('https://', '')}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{m.test_results?.length || 0} Traces Captured</p>
                  </div>
                </div>
                <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            ))
          ) : (
            suites.map(s => (
              <div key={s.id} className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/10">
                    <Layout size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRunSuite(s)} disabled={executingSuiteId === s.id} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                      {executingSuiteId === s.id ? <Loader2 className="animate-spin" size={20}/> : <Play size={20} fill="currentColor"/>}
                    </button>
                    <button onClick={() => handleDeleteSuite(s.id)} className="p-3 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                      <Trash2 size={20}/>
                    </button>
                  </div>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1 truncate">{s.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase truncate opacity-60 mb-4">{s.base_url}</p>
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Code size={12} /> {s.test_steps?.length || 0} Steps
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMission(null)} className="fixed inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-md z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-full md:w-[550px] bg-white dark:bg-[#0A0A0A] border-l border-slate-200 dark:border-white/10 z-50 p-6 md:p-10 overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tighter flex items-center gap-2"><Eye size={20} className="text-blue-500"/> Trace Log</h2>
                <button onClick={() => setSelectedMission(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X /></button>
              </div>
              <div className="space-y-6 pb-20">
                {selectedMission.test_results?.map((res, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-blue-500 uppercase italic tracking-widest">Step {i+1}</span>
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 font-medium italic leading-relaxed">"{res.reasoning}"</p>
                    <div className="bg-white dark:bg-black/50 p-4 rounded-xl border border-slate-200 dark:border-white/5 font-mono text-[9px] text-slate-500 overflow-hidden">
                      <div className="flex items-center gap-2 mb-2 text-blue-500 uppercase font-black"><Code size={12}/> {res.action || 'CLICK'}</div>
                      <div className="truncate text-slate-700 dark:text-blue-400/80 font-bold">TARGET: {res.title}</div>
                      <div className="truncate opacity-50 mt-1">SEL: {res.decided_value || res.selector}</div>
                    </div>
                  </div>
                ))}
                <button onClick={() => handleSaveToSuite(selectedMission)} disabled={isSavingSuite} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 active:scale-95">
                  {isSavingSuite ? <Loader2 className="animate-spin" /> : <Save size={18}/>}
                  {isSavingSuite ? 'Syncing DNA...' : 'Save as Active Suite'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MASTER REPORT DASHBOARD */}
      <AnimatePresence>
        {lastReport && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLastReport(null)} className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60]" />
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed inset-4 md:inset-10 bg-white dark:bg-[#08090F] z-[70] rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/10">
              
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 dark:bg-white/[0.02]">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="bg-emerald-500 p-1.5 rounded-lg text-white"><ShieldAlert size={20}/></div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white transition-colors">VIGA MASTER ANALYSIS</h2>
                  </div>
                  <p className="text-xs text-slate-500 font-bold uppercase flex items-center gap-2">
                    <Globe size={12}/> {lastReport.url}
                  </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={downloadReport} className="flex-1 md:flex-none px-6 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-black uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                    <Download size={16}/> Export Report
                  </button>
                  <button onClick={() => setLastReport(null)} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all">
                    <X size={20}/>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Visual Evidence */}
                <div className="flex-[1.2] p-6 md:p-8 overflow-y-auto bg-slate-100/50 dark:bg-black/20 text-center">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center justify-center gap-2 italic">
                    <Beaker size={14} className="text-blue-500"/> Full Page Trace Evidence
                  </h4>
                  <div className="inline-block rounded-[24px] overflow-hidden border-4 border-white dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900 max-w-full">
                    <img src={lastReport.screenshotPath} className="w-full h-auto object-contain max-h-[70vh]" alt="Screenshot" />
                  </div>
                </div>

                {/* Analysis Data */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto border-l border-slate-100 dark:border-white/5 bg-white dark:bg-[#080808]">
                  <div className="space-y-8">
                    <section>
                      <h4 className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Bug size={16} /> Critical Anomalies Detected
                      </h4>
                      <div className="space-y-4">
                        {lastReport.vigaMasterReport?.criticalBugs?.length > 0 ? (
                          lastReport.vigaMasterReport.criticalBugs.map((bug, i) => (
                            <div key={i} className="p-5 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-2xl">
                              <p className="text-sm font-black text-red-700 dark:text-red-400 mb-3 uppercase">{bug.reason}</p>
                              <div className="bg-white/80 dark:bg-black/40 p-3 rounded-xl border border-red-200/50 dark:border-white/5">
                                <code className="text-[10px] font-mono break-all text-slate-600 dark:text-red-300/70">{bug.selector}</code>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-slate-400 font-bold uppercase italic p-4 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl text-center">
                            No critical issues identified.
                          </div>
                        )}
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-4">Functional Failures Log</h4>
                      <div className="space-y-3">
                        {lastReport.vigaMasterReport?.functionalFailures?.map((fail, i) => (
                          <div key={i} className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 rounded-2xl flex gap-4 items-start">
                            <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                              <Activity size={14}/>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{fail.description}</p>
                          </div>
                        ))}
                      </div>
                    </section>
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
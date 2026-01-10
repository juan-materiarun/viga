'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, Target, Cpu, Monitor, Zap, Activity, BrainCircuit, Globe, ChevronRight, Save, CheckCircle2, AlertTriangle, BarChart3
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useTheme } from '../contexts/ThemeContext'; 

// --- FIX CRÍTICO: Importación como módulo para evitar "is not a function" ---
import * as agents from '../actions/agents'; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

export default function MissionControlPage() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [testCases, setTestCases] = useState([]);
  const [savingId, setSavingId] = useState(null); 
  const { theme } = useTheme(); 

  // --- LÓGICA DE ESTADÍSTICAS ---
  const stats = useMemo(() => {
    const relevantTests = testCases.filter(t => t.id !== 'scan');
    const total = relevantTests.length;
    const passed = relevantTests.filter(t => t.status === 'success').length;
    const failed = relevantTests.filter(t => t.status === 'failed').length;
    const health = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { total, passed, failed, health };
  }, [testCases]);

  const handleStartMission = async () => {
    if (!url) return;

    // Validación de carga del motor
    if (!agents.createMissionRecord) {
        console.error("VIGA Engine failed to bind to Client.");
        alert("Error de sincronización. Por favor, refresca la página.");
        return;
    }

    setStatus('deploying');
    
    // Reset de logs con el paso de escaneo inicial
    setTestCases([
      { id: 'scan', title: 'Architect Prime', status: 'running', objective: 'Mapping DOM & assigning specialized units...', agentType: 'standard' }
    ]);
    
    try {
      // 1. Crear registro en DB
      const missionId = await agents.createMissionRecord(url);
      
      // 2. Obtener plan de la IA
      const planResult = await agents.getMissionPlan(url); 
      
      if (!planResult.success) {
        if (missionId) await agents.updateMissionStatus(missionId, 'failed');
        setStatus('error');
        setTestCases(prev => prev.map(t => t.id === 'scan' ? { ...t, status: 'failed', objective: `Error: ${planResult.error}` } : t));
        return;
      }

      // 3. Preparar ejecución de tests
      const initialTests = planResult.plan.map((t, idx) => ({ ...t, id: `test-${idx}`, status: 'pending' }));
      setTestCases(initialTests);

      // 4. Ejecución Secuencial
      for (const test of initialTests) {
        // Marcar test actual como en ejecución
        setTestCases(prev => prev.map(t => t.id === test.id ? { ...t, status: 'running' } : t));
        
        // Ejecutar acción en el navegador
        const result = await agents.executeSingleTest(url, test, planResult.pageContext);
        
        // Guardar resultado individual
        if (missionId) await agents.saveTestResult(missionId, result);
        
        // Actualizar UI con el resultado
        setTestCases(prev => prev.map(t => 
          t.id === test.id ? { ...result, id: test.id, status: result.status } : t
        ));
      }

      // 5. Finalizar Misión
      // Calculamos el estado final basado en si hubo fallos
      const hasFailures = testCases.some(t => t.status === 'failed');
      const finalStatus = hasFailures ? 'partial_success' : 'success';
      
      if (missionId) await agents.updateMissionStatus(missionId, finalStatus);
      setStatus('completed');
      
    } catch (error) {
      console.error("Mission Control Error:", error);
      setStatus('error');
    }
  };

  const handleSaveToSuite = async (testResult) => {
    setSavingId(testResult.id);
    const suiteName = prompt("Nombre para esta Suite (Regresión):", `${testResult.title} - ${testResult.status === 'success' ? 'PASS' : 'FAIL'}`);
    if (!suiteName) { setSavingId(null); return; }

    try {
      const { data: suite } = await supabase
        .from('test_suites')
        .insert([{ name: suiteName, base_url: url, status: testResult.status }])
        .select().single();

      await supabase.from('test_steps').insert([{
        suite_id: suite.id,
        action_type: testResult.actionTaken?.action || 'click',
        selector: testResult.actionTaken?.selector || testResult.decidedValue || 'unknown',
        dna_html: testResult.dna?.fullHtml || null,
        step_order: 0
      }]);

      alert("¡Capturado para análisis permanente!");
    } catch (err) {
      console.error(err);
      alert("Error al guardar la suite.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="mb-12 border-b border-white/5 pb-8 flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-500 tracking-[0.4em]">
            <Activity size={12} /> Mission Control
          </div>
          <h1 className={`text-3xl font-black tracking-tighter uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Autonomous Orchestration
          </h1>
        </div>

        {testCases.length > 1 && (
          <div className="flex gap-6 items-center bg-white/5 p-4 rounded-3xl border border-white/5">
             <div className="text-center">
               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">System Health</p>
               <p className={`text-xl font-black ${stats.health > 70 ? 'text-emerald-500' : 'text-amber-500'}`}>{stats.health}%</p>
             </div>
             <div className="h-8 w-[1px] bg-white/10" />
             <div className="flex gap-4">
               <div>
                 <p className="text-[8px] font-black text-slate-500 uppercase">Passed</p>
                 <p className="text-sm font-black text-emerald-500">{stats.passed}</p>
               </div>
               <div>
                 <p className="text-[8px] font-black text-slate-500 uppercase">Failed</p>
                 <p className="text-sm font-black text-red-500">{stats.failed}</p>
               </div>
             </div>
          </div>
        )}
      </header>

      {/* INPUT COMMAND */}
      <div className={`mb-16 p-2 rounded-[32px] border transition-all ${
        status === 'deploying' ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 
        theme === 'dark' ? 'border-white/5 bg-[#080808]' : 'border-slate-200 bg-white shadow-xl'
      } flex items-center group`}>
        <div className="px-5 text-slate-400">
          {status === 'deploying' ? <Loader2 className="animate-spin text-blue-500" size={20}/> : <Globe size={20}/>}
        </div>
        <input 
          type="text"
          placeholder="HTTPS://ENTER-TARGET-URL.COM"
          className={`flex-1 bg-transparent border-none outline-none py-5 text-xs font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={status === 'deploying'}
        />
        <button 
          onClick={handleStartMission}
          disabled={status === 'deploying'}
          className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
        >
          {status === 'deploying' ? <><Loader2 size={14} className="animate-spin"/> Scanning DOM</> : 'Start Mission'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] flex items-center gap-2">
              Tactical Log <ChevronRight size={12} />
            </h2>
            {status === 'completed' && (
              <span className="text-[9px] font-black bg-emerald-500 text-white px-3 py-1 rounded-full uppercase tracking-widest animate-fade-in">
                Mission Finished
              </span>
            )}
          </div>
          
          {testCases.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-[40px] p-24 text-center">
              <Zap className="mx-auto text-slate-800 mb-4" size={40}/>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Awaiting Command</p>
            </div>
          ) : (
            <div className="space-y-4">
              {testCases.map((test, i) => (
                <MissionRow 
                  key={test.id || i} 
                  test={test} 
                  theme={theme} 
                  onSave={() => handleSaveToSuite(test)}
                  isSaving={savingId === test.id}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className={`${theme === 'dark' ? 'bg-[#080808] border-white/5' : 'bg-white border-slate-200'} border rounded-[32px] p-8 space-y-8`}>
            <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] flex items-center gap-2">
              <BrainCircuit size={14} className="text-blue-500"/> Agent Intel
            </h2>
            <AgentStatus label="UX Specialist" desc="Visual & Flows" active={testCases.some(t => t.agentType === 'ux' && t.status === 'running')} />
            <AgentStatus label="Logic Eng" desc="Functional" active={testCases.some(t => t.agentType === 'functional' && t.status === 'running')} />
            <AgentStatus label="A11y Monitor" desc="Compliance" active={testCases.some(t => t.agentType === 'access' && t.status === 'running')} />
          </div>
          
          {testCases.length > 1 && (
            <div className="bg-blue-600 p-8 rounded-[32px] text-white space-y-4 shadow-lg shadow-blue-500/20">
              <BarChart3 size={24} />
              <div>
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Overall Coverage</p>
                <p className="text-3xl font-black">{stats.health}%</p>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full transition-all duration-1000" style={{ width: `${stats.health}%` }} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function MissionRow({ test, theme, onSave, isSaving }) {
  const isRunning = test.status === 'running';
  const isSuccess = test.status === 'success';
  const isFailed = test.status === 'failed';

  const agentConfigs = {
    ux: { label: 'UX/UI Agent', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: <Target size={16}/> },
    functional: { label: 'Logic Agent', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <Cpu size={16}/> },
    access: { label: 'A11y Agent', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Monitor size={16}/> },
    standard: { label: 'System', color: 'bg-slate-500/10 text-slate-400 border-white/10', icon: <Zap size={16}/> }
  };

  const config = agentConfigs[test.agentType] || agentConfigs.standard;

  return (
    <div className={`rounded-2xl border p-5 transition-all ${
      isRunning ? 'border-blue-500/50 bg-blue-500/5' : 
      isFailed ? 'border-red-500/30 bg-red-500/5' : 'border-white/5 bg-white/5'
    }`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isRunning ? 'bg-blue-500 text-white animate-pulse' : 
            isFailed ? 'bg-red-500 text-white' :
            isSuccess ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-500'
          }`}>
            {isRunning ? <Loader2 className="animate-spin" size={18}/> : 
             isSuccess ? <CheckCircle2 size={18}/> :
             isFailed ? <AlertTriangle size={18}/> : config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[7px] px-2 py-0.5 rounded-full font-black uppercase border ${config.color}`}>
                {config.label}
              </span>
              <h4 className="text-[11px] font-black uppercase text-white tracking-widest">{test.title}</h4>
              {isSuccess && <span className="text-[8px] text-emerald-500 font-black tracking-tighter">[PASSED]</span>}
              {isFailed && <span className="text-[8px] text-red-500 font-black tracking-tighter">[FAILED]</span>}
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase italic">{test.objective}</p>
          </div>
        </div>

        {(isSuccess || isFailed) && (
          <button 
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center gap-2 border px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              isFailed ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white' :
              'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
            }`}
          >
            {isSaving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
            {isSaving ? 'Capturing...' : isFailed ? 'Save Evidence' : 'Capture Suite'}
          </button>
        )}
      </div>

      {test.reasoning && (
        <div className={`mt-4 pt-4 border-t ${isFailed ? 'border-red-500/10' : 'border-white/5'}`}>
          <p className="text-[9px] text-slate-400 font-mono leading-relaxed">
            <span className={`${isFailed ? 'text-red-500' : 'text-blue-500'} mr-2 font-black uppercase`}>
              {isFailed ? 'FAILURE_REPORT:' : 'AGENT_THINKING:'}
            </span> 
            {test.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}

function AgentStatus({ label, desc, active }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className={`text-[10px] font-black uppercase tracking-widest block ${active ? 'text-white' : 'text-slate-600'}`}>{label}</span>
        <span className="text-[8px] font-bold text-slate-500 uppercase">{desc}</span>
      </div>
      <div className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-slate-800'}`} />
    </div>
  );
}
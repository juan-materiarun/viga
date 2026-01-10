'use client';

import React, { useState } from 'react';
import { 
  Loader2, CheckCircle2, AlertTriangle, Target, Cpu, Monitor, 
  Zap, Activity, BrainCircuit, ShieldAlert, Beaker, Globe
} from 'lucide-react';
// Importamos las nuevas funciones atómicas
import { getMissionPlan, executeSingleTest } from '../actions/agents'; 

export default function MissionControlPage() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [testCases, setTestCases] = useState([]);

  const handleStartMission = async () => {
    if (!url) return;
    setStatus('deploying');
    
    // 1. Feedback visual de inicio
    setTestCases([
      { id: 'scan', title: 'Agente Arquitecto', status: 'running', detail: 'Analizando DOM y planeando misiones...', type: 'standard' }
    ]);
    
    try {
      // FASE 1: Obtener el plan de misiones (Pulsación corta < 10s)
      const planResult = await getMissionPlan(url);
      
      if (!planResult.success) {
        setStatus('error');
        return;
      }

      // Preparamos el tablero con los tests en 'pending'
      const initialTests = planResult.plan.map(t => ({ ...t, status: 'pending' }));
      setTestCases(initialTests);

      // FASE 2: Ejecución Secuencial (Orquestación SaaS)
      // Recorremos cada test y lo ejecutamos como una llamada independiente
      for (const test of initialTests) {
        // Actualizamos UI a 'running' para el test actual
        setTestCases(prev => prev.map(t => t.id === test.id ? { ...t, status: 'running' } : t));

        // Ejecutamos solo ESTE test
        const result = await executeSingleTest(url, test, planResult.pageContext);
        
        // Actualizamos UI con el resultado final de ese test
        setTestCases(prev => prev.map(t => t.id === test.id ? result : t));
      }

      setStatus('success');
    } catch (error) {
      console.error("Mission Control Error:", error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 p-10 selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto animate-in fade-in duration-700">
        
        {/* HEADER CON LOGO */}
        <header className="mb-12 flex justify-between items-end border-b border-white/5 pb-8">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-2 bg-blue-600 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition duration-1000"></div>
              {/* Prioriza tus logos en /public */}
              <img src="/logo-dark.png" alt="VIGA" className="h-10 w-auto" onError={(e) => e.target.style.display='none'}/>
              <h1 className="text-3xl font-black tracking-tighter uppercase text-white group-hover:text-blue-500 transition-colors">VIGA</h1>
            </div>
            <div className="h-8 w-[1px] bg-white/10 mx-2" />
            <div>
              <h2 className="text-[10px] font-black uppercase text-blue-500 tracking-[0.4em] mb-1">Mission Control</h2>
              <p className="text-slate-500 text-[8px] font-bold uppercase tracking-[0.2em]">Autonomous QA Orchestration</p>
            </div>
          </div>
          <div className="hidden md:block text-right">
             <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Engine Status</p>
             <span className={`text-[10px] font-black uppercase ${status === 'deploying' ? 'text-blue-500 animate-pulse' : 'text-slate-500'}`}>
                {status === 'deploying' ? 'Agents Deployed' : 'Standby Mode'}
             </span>
          </div>
        </header>

        {/* INPUT COMMAND */}
        <div className={`mb-16 p-2 rounded-2xl border transition-all duration-500 ${
          status === 'success' ? 'border-emerald-500/30 bg-emerald-500/[0.01]' : 
          status === 'error' ? 'border-red-500/30 bg-red-500/[0.01]' : 'border-white/10 bg-[#080808]'
        } flex items-center shadow-2xl relative group`}>
          <div className="px-5 text-slate-700 group-hover:text-blue-500 transition-colors">
            {status === 'deploying' ? <Loader2 className="animate-spin text-blue-500" size={22}/> : <Globe size={22}/>}
          </div>
          <input 
            type="text"
            placeholder="HTTPS://TARGET-WEB-APP.COM"
            className="flex-1 bg-transparent border-none outline-none py-4 text-xs font-black uppercase tracking-[0.2em] text-white placeholder:text-slate-800"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartMission()}
            disabled={status === 'deploying'}
          />
          <button 
            onClick={handleStartMission}
            disabled={status === 'deploying'}
            className={`px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
              status === 'deploying' ? 'bg-slate-900 text-slate-600' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/10'
            }`}
          >
            {status === 'deploying' ? 'Executing...' : 'Start Mission'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-3 space-y-6">
            <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] flex items-center gap-2 mb-2">
              <Activity size={14} className="text-blue-500"/> Tactical Log
            </h2>
            {testCases.length === 0 ? (
              <div className="border border-white/5 rounded-3xl p-24 flex flex-col items-center justify-center text-center bg-[#030303]">
                <Zap className="text-slate-900 mb-4" size={40}/>
                <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.2em]">Ready for coordinate input</p>
              </div>
            ) : (
              testCases.map((test, i) => <MissionRow key={test.id || i} test={test} index={i} />)
            )}
          </div>

          <aside className="space-y-6">
            <div className="bg-[#080808] border border-white/5 rounded-3xl p-8 h-fit space-y-8 shadow-inner">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] flex items-center gap-2">
                  <BrainCircuit size={14} className="text-blue-500"/> Intelligence
                </h2>
                <AgentStatus label="Architect" desc="SaaS Strategy" active={status === 'deploying'} />
                <AgentStatus label="Strategist" desc="Atomic Execution" active={status === 'deploying'} />
                <AgentStatus label="Auditor" desc="Evidence Cloud" active={status === 'success'} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MissionRow({ test, index }) {
  const isRunning = test.status === 'running';
  const isSuccess = test.status === 'success';
  const isFailed = test.status === 'failed';
  const isPending = test.status === 'pending';

  const typeStyles = {
    happy: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    negative: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    edge: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    standard: 'text-slate-500 bg-white/5 border-white/10'
  };

  const currentTypeStyle = typeStyles[test.type] || typeStyles.standard;

  return (
    <div 
      className={`group overflow-hidden rounded-2xl border transition-all duration-500 animate-in slide-in-from-left-4 ${
        isRunning ? 'bg-blue-500/[0.03] border-blue-500/40 shadow-lg shadow-blue-500/5' : 
        isSuccess ? 'bg-[#080808] border-white/5 hover:border-white/10' :
        isFailed ? 'bg-red-500/[0.02] border-red-500/20 shadow-lg shadow-red-500/5' : 
        isPending ? 'bg-white/[0.01] border-white/5 opacity-50' : 'bg-white/[0.02] border-white/5'
      }`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="p-6 flex items-center gap-6">
        <div className={`p-3 rounded-xl transition-all ${
          isSuccess ? 'bg-emerald-500/10 text-emerald-500' : 
          isFailed ? 'bg-red-500/10 text-red-500' : 
          isRunning ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'
        }`}>
          {isRunning ? <Loader2 size={18} className="animate-spin"/> : isSuccess ? <CheckCircle2 size={18}/> : isPending ? <Zap size={18}/> : <ShieldAlert size={18}/>}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1.5">
            <h4 className="text-xs font-black uppercase tracking-widest text-white leading-none">{test.title || test.name}</h4>
            <span className={`text-[7px] px-2 py-0.5 rounded font-black uppercase border ${currentTypeStyle}`}>
              {test.type || 'queued'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight italic opacity-80">{test.detail || test.objective}</p>
        </div>

        <div className="flex items-center gap-4">
          {isFailed && test.evidence && (
            <a href={`/${test.evidence}`} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20">
              <Monitor size={12}/> Evidence
            </a>
          )}
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isSuccess ? 'text-emerald-500' : isFailed ? 'text-red-500' : isRunning ? 'text-blue-500 animate-pulse' : 'text-slate-600'}`}>
            {test.status}
          </span>
        </div>
      </div>

      {(test.reasoning || test.decidedValue) && !isPending && (
        <div className="px-6 py-3 bg-white/[0.01] border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BrainCircuit size={10} className="text-blue-500/50"/>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tight italic">
              Reasoning: {test.reasoning || 'Autonomous analysis...'}
            </p>
          </div>
          {test.decidedValue && (
            <div className="flex items-center gap-2 bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10">
               <Beaker size={10} className="text-blue-400"/>
               <span className="text-[8px] font-mono text-blue-400/80 tracking-tighter uppercase">Payload: "{test.decidedValue}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgentStatus({ label, desc, active }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-[10px] font-black text-white uppercase tracking-widest block">{label}</span>
        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tight">{desc}</span>
      </div>
      <div className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${active ? 'bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-slate-800'}`} />
    </div>
  );
}
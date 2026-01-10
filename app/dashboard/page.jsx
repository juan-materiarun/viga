'use client';

import React, { useState } from 'react';
import { 
  Globe, Loader2, CheckCircle2, AlertTriangle, 
  PlayCircle, Activity, Zap, Target, Cpu, Monitor, ArrowUpRight
} from 'lucide-react';
import { executeVigaMission } from '../actions/agents'; 

export default function MissionControlPage() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | deploying | success | error
  const [testCases, setTestCases] = useState([]);

  const handleStartMission = async () => {
    if (!url) return;
    setStatus('deploying');
    
    // Feedback inicial
    setTestCases([
      { id: 'scan', title: 'Agente Explorador: Escaneando target...', status: 'running', detail: 'Analizando DOM y jerarquía visual.' },
      { id: 'arch', title: 'Agente Arquitecto: Diseñando misiones...', status: 'pending', detail: 'Generando casos de prueba basados en IA.' }
    ]);
    
    try {
      const result = await executeVigaMission(url);
      
      if (result.success) {
        setTestCases(result.rawTests);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error("Mission Control Error:", error);
      setStatus('error');
    }
  };

  return (
    <div className="p-10 max-w-6xl mx-auto animate-in fade-in duration-700">
      <header className="mb-10 flex justify-between items-end border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20">
              <Cpu size={18} className="text-white"/>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase text-white">VIGA / MISSION CONTROL</h1>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Autonomous QA Agent Orchestration</p>
        </div>
      </header>

      {/* INPUT COMMAND */}
      <div className={`mb-12 p-2 rounded-2xl border transition-all duration-500 ${
        status === 'success' ? 'border-emerald-500/30 bg-emerald-500/[0.01]' : 
        status === 'error' ? 'border-red-500/30 bg-red-500/[0.01]' : 'border-white/10 bg-[#050505]'
      } flex items-center shadow-2xl`}>
        
        <div className="px-5 text-slate-700">
          {status === 'deploying' ? <Loader2 className="animate-spin text-blue-500" size={22}/> : <Target size={22}/>}
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
            status === 'deploying' ? 'bg-slate-900 text-slate-600' : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {status === 'deploying' ? 'Executing...' : 'Deploy Agents'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* LOG DE EJECUCIÓN */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-6 flex items-center gap-2">
            <Activity size={14} className="text-blue-500"/> Tactical Execution Log
          </h2>
          
          {testCases.length === 0 ? (
            <div className="border border-white/5 rounded-3xl p-24 flex flex-col items-center justify-center text-center bg-[#030303]">
              <Zap className="text-slate-800 mb-4" size={32}/>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">System Standby - Awaiting URL</p>
            </div>
          ) : (
            testCases.map((test) => <MissionRow key={test.id} test={test} />)
          )}
        </div>

        {/* AGENT STATUS */}
        <div className="bg-[#050505] border border-white/5 rounded-3xl p-8 h-fit space-y-6">
            <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Agent Intelligence</h2>
            <AgentStatus label="Architect" active={status === 'deploying'} />
            <AgentStatus label="Strategist" active={status === 'deploying'} />
            <AgentStatus label="Auditor" active={status === 'success'} />
            <div className="pt-6 border-t border-white/5 mt-4">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Evidence Folder</p>
              <p className="text-[10px] font-bold text-white font-mono italic">/public/missions/errors</p>
            </div>
        </div>
      </div>
    </div>
  );
}

function MissionRow({ test }) {
  const isRunning = test.status === 'running';
  const isSuccess = test.status === 'success';
  const isFailed = test.status === 'failed';

  return (
    <div className={`p-6 rounded-2xl border transition-all duration-500 flex flex-col gap-4 ${
      isRunning ? 'bg-blue-500/[0.02] border-blue-500/20' : 
      isSuccess ? 'bg-emerald-500/[0.02] border-emerald-500/10' :
      isFailed ? 'bg-red-500/[0.02] border-red-500/10' : 'bg-white/[0.02] border-white/5'
    }`}>
      <div className="flex items-center gap-5">
        <div className={`p-2 rounded-lg ${isSuccess ? 'text-emerald-500' : isFailed ? 'text-red-500' : 'text-blue-500'}`}>
          {isRunning ? <Loader2 size={18} className="animate-spin"/> : isSuccess ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}
        </div>
        <div className="flex-1">
          <h4 className="text-[11px] font-black uppercase tracking-[0.1em] text-white">{test.title}</h4>
          <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 italic">{test.detail}</p>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest ${isSuccess ? 'text-emerald-500' : isFailed ? 'text-red-500' : 'text-blue-500'}`}>
          {test.status}
        </span>
      </div>

      {isFailed && test.evidence && (
        <a 
          href={`/${test.evidence}`} 
          target="_blank" 
          className="ml-10 flex items-center gap-2 w-fit px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
        >
          <Monitor size={12}/> View Error Evidence
        </a>
      )}
    </div>
  );
}

function AgentStatus({ label, active }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-white uppercase tracking-widest">{label}</span>
      <div className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-slate-800'}`} />
    </div>
  );
}
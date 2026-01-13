'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2, Target, Cpu, Activity, BrainCircuit, Globe,
  Terminal, AlertCircle, CheckCircle2, ShieldAlert, Flame, Image as ImageIcon, X, ExternalLink
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useTheme } from '../contexts/ThemeContext';
import ChaosTerminal from '../chaos-terminal/ChaosTerminal'; 
import StrategicHistory from './StrategicHistory';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// --- COMPONENTE: MODAL DE EVIDENCIA ---
function EvidenceModal({ url, onClose, isDark }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`relative max-w-5xl w-full rounded-[30px] overflow-hidden border ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Visual Evidence Captured</span>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-2 bg-slate-900/50">
          <img src={url} alt="Evidence" className="w-full h-auto rounded-xl shadow-2xl" />
        </div>
        <div className="p-4 text-center">
          <a href={url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-slate-500 hover:text-blue-500 uppercase flex items-center justify-center gap-2">
            Open original <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE: SATURATION MONITOR (Saturador de Cobertura) ---
function SaturationMonitor({ suiteId, isDark, missionMode, missionGoal, testCases, suiteStatus }) {
  const [elements, setElements] = useState([]);

  useEffect(() => {
    if (!suiteId) return;
    const fetchElements = async () => {
      const { data } = await supabase.from('discovered_elements').select('*').eq('suite_id', suiteId);
      if (data) setElements(data);
    };
    fetchElements();
    const channel = supabase
      .channel(`coverage-${suiteId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'discovered_elements', filter: `suite_id=eq.${suiteId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') setElements(prev => [...prev, payload.new]);
        else if (payload.eventType === 'UPDATE') setElements(prev => prev.map(el => el.id === payload.new.id ? payload.new : el));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [suiteId]);

  const totalTested = elements.filter(e => e.status === 'tested').length;
  const progress = elements.length > 0 ? (totalTested / elements.length) * 100 : 0;

  const isMissionSuccess =
    testCases.some(t => t.objective.includes('cumplió') || (t.status === 'success' && t.agentType?.includes('🎯'))) ||
    suiteStatus === 'completed';

  if (missionMode === 'strike') {
    return (
      <div className={`mb-8 p-8 rounded-[40px] border animate-in zoom-in-95 duration-500 ${isDark ? 'bg-[#050505] border-purple-500/20' : 'bg-white border-purple-100 shadow-xl shadow-purple-500/5'}`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500 mb-2">Tactical Strike Objective</h3>
            <p className={`text-2xl font-black italic uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {suiteStatus === 'completed' ? 'Mission Accomplished' : suiteStatus === 'error' ? 'Mission Failed' : 'Engaging Target…'}
            </p>
          </div>
          <div className={`p-4 rounded-2xl ${isDark ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
            <Target className={`animate-pulse ${isMissionSuccess ? 'text-emerald-500' : 'text-purple-500'}`} size={24} />
          </div>
        </div>
        <div className="relative h-4 w-full bg-slate-900/50 rounded-full overflow-hidden p-1 border border-white/5">
          <div className={`h-full rounded-full transition-all duration-1000 ${isMissionSuccess ? 'w-full bg-emerald-500 shadow-[0_0_20px_#10b981]' : 'w-[40%] bg-purple-600 animate-pulse'}`} />
        </div>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Goal: {missionGoal || 'System Validation'}</span>
          <span className="font-mono text-xs font-bold text-purple-400">{suiteStatus.toUpperCase()}</span>
        </div>
      </div>
    );
  }

  if (elements.length === 0) return null;

  return (
    <div className={`mb-8 p-6 rounded-[40px] border animate-in fade-in slide-in-from-bottom-4 duration-700 ${isDark ? 'bg-[#050505] border-white/5' : 'bg-white border-slate-200 shadow-xl'}`}>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-1">Saturation Monitor</h3>
          <p className={`text-3xl font-black italic uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {progress.toFixed(0)}% <span className="text-blue-600">Coverage</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Annihilated Hotspots</p>
          <p className={`font-mono text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalTested} / {elements.length}</p>
        </div>
      </div>
      <div className="flex h-3 gap-1 w-full rounded-full overflow-hidden bg-slate-900/50 p-1 border border-white/5 backdrop-blur-md">
        {elements.map((el) => (
          <div key={el.id} className={`flex-1 transition-all duration-700 rounded-[1px] ${el.status === 'tested' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-slate-800'}`} />
        ))}
      </div>
    </div>
  );
}

// --- COMPONENTE: LIVE TACTICAL LOG ---
function TacticalLog({ testCases, missionMode, isDark, onViewEvidence }) {
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' }); }, [testCases]);

  return (
    <div id="chaos-terminal" className={`relative overflow-hidden border rounded-[40px] p-8 min-h-[550px] flex flex-col transition-all ${isDark ? 'bg-[#050505] border-white/5' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${missionMode === 'chaos' ? 'bg-orange-500/10 text-orange-500' : missionMode === 'strike' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
              <Terminal size={18} />
            </div>
            <div>
              <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-slate-900'}`}>Neural Stream Execution</h3>
              <p className="text-[8px] text-slate-500 font-bold uppercase">Parallel Agent Telemetry</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3 font-mono text-[11px] overflow-y-auto max-h-[500px] pr-2 scrollbar-thin">
          {testCases.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 italic opacity-50">
              <Activity size={40} className="mb-4 animate-spin duration-[3s]" />
              <p>Awaiting Swarm Uplink...</p>
            </div>
          ) : (
            testCases.map((test) => (
              <div key={test.id} className={`flex items-start gap-3 p-4 rounded-xl border animate-in slide-in-from-bottom-2 duration-500 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <span className={test.status === 'success' ? 'text-emerald-500' : test.status === 'failed' ? 'text-red-500' : 'text-amber-500'}>
                  {test.status === 'success' ? <CheckCircle2 size={16} /> : test.status === 'failed' ? <ShieldAlert size={16} /> : <AlertCircle size={16} />}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${test.agentType?.includes('striker') ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {test.agentType?.toUpperCase()}
                      </span>
                      <span className={`font-black uppercase tracking-tighter ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{test.title}</span>
                    </div>
                    {test.screenshotUrl && (
                      <button onClick={() => onViewEvidence(test.screenshotUrl)} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all border border-blue-500/20">
                        <ImageIcon size={10} /><span className="text-[8px] font-black uppercase">View Evidence</span>
                      </button>
                    )}
                  </div>
                  <p className="text-slate-500 leading-relaxed text-[10px]">{test.objective}</p>
                </div>
                <div className="text-[8px] text-slate-600 font-bold">{test.timestamp}</div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function MissionControlPage() {
  const [url, setUrl] = useState('');
  const [chaosOpen, setChaosOpen] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [status, setStatus] = useState('idle');
  const [missionMode, setMissionMode] = useState('scout');
  const [missionGoal, setMissionGoal] = useState('');
  const [activeSuiteId, setActiveSuiteId] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!activeSuiteId) return;
    setTestCases([]);

    const stepsChannel = supabase.channel(`steps-${activeSuiteId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'test_steps', filter: `suite_id=eq.${activeSuiteId}` },
        (p) => setTestCases(prev => [...prev, {
          id: p.new.id, title: p.new.selector || 'Sistema', objective: p.new.expected_result || 'Analizando...',
          status: p.new.status, agentType: p.new.action_type || 'system', screenshotUrl: p.new.screenshot_url,
          timestamp: new Date(p.new.created_at).toLocaleTimeString()
        }]))
      .subscribe();

    const suiteChannel = supabase.channel(`suite-${activeSuiteId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'test_suites', filter: `id=eq.${activeSuiteId}` },
        (p) => setStatus(p.new.status))
      .subscribe();

    return () => { supabase.removeChannel(stepsChannel); supabase.removeChannel(suiteChannel); };
  }, [activeSuiteId]);

  const handleStartMission = async () => {
    if (!url) return;
    setStatus('deploying');
    if (missionMode === 'chaos') setChaosOpen(true);

    try {
      const { data: suite, error } = await supabase.from('test_suites').insert([{
        name: `${missionMode.toUpperCase()}: ${url}`, base_url: url, status: 'running'
      }]).select().single();

      if (error) throw error;
      setActiveSuiteId(suite.id);
      setStatus('running');

      const endpoint = missionMode === 'scout' ? '/api/run-scout' : missionMode === 'strike' ? '/api/run-strike' : '/api/run-chaos';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, suite_id: suite.id, ...(missionMode === 'strike' && { goal: missionGoal }) })
      });
    } catch (e) { setStatus('error'); }
  };

  return (
    <div className="max-w-7xl mx-auto pb-32 px-6 relative">
      <EvidenceModal url={selectedEvidence} onClose={() => setSelectedEvidence(null)} isDark={isDark} />
      
      <ChaosTerminal open={chaosOpen} suiteId={activeSuiteId} onClose={() => setChaosOpen(false)} />

      <header className={`mb-12 border-b py-10 flex justify-between items-end ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-500 tracking-[0.4em]">
            <Activity size={14} className="animate-pulse" /> Swarm Intelligence System v2.0
          </div>
          <h1 className={`text-5xl font-black tracking-tighter uppercase italic ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Audit <span className="text-blue-600">Orchestrator</span>
          </h1>
        </div>
      </header>

      <div className={`mb-16 p-8 rounded-[50px] border transition-all ${isDark ? 'bg-[#080808] border-white/5' : 'bg-white border-slate-200 shadow-2xl'}`}>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-4">
            <div className="flex gap-2 p-1.5 bg-black/40 rounded-[24px] border border-white/5">
              <button onClick={() => setMissionMode('scout')} className={`flex items-center gap-2 text-[9px] font-black px-5 py-2.5 rounded-xl transition-all ${missionMode === 'scout' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><Globe size={12} /> SCOUT</button>
              <button onClick={() => setMissionMode('chaos')} className={`flex items-center gap-2 text-[9px] font-black px-5 py-2.5 rounded-xl transition-all ${missionMode === 'chaos' ? 'bg-orange-600 text-white' : 'text-slate-500'}`}><Flame size={12} /> CHAOS</button>
              <button onClick={() => setMissionMode('strike')} className={`flex items-center gap-2 text-[9px] font-black px-5 py-2.5 rounded-xl transition-all ${missionMode === 'strike' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}><Target size={12} /> STRIKE</button>
            </div>
          </div>

          <div className="px-4 space-y-4">
            {/* INPUT DE STRIKE RESTAURADO */}
            {missionMode === 'strike' && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <div className={`flex items-center gap-4 p-4 rounded-3xl border ${isDark ? 'bg-purple-500/5 border-purple-500/20' : 'bg-purple-50 border-purple-100'}`}>
                  <BrainCircuit size={20} className="text-purple-500 ml-2" />
                  <input 
                    type="text" 
                    placeholder="¿QUÉ FUNCIÓN ESPECÍFICA QUERÉS VALIDAR? (Ej: Pedidos de cocina, Agenda de turnos)" 
                    className={`flex-1 bg-transparent border-none outline-none text-sm font-bold ${isDark ? 'text-purple-200' : 'text-purple-900'}`} 
                    value={missionGoal} 
                    onChange={(e) => setMissionGoal(e.target.value)} 
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`md:col-span-2 flex items-center gap-4 p-4 rounded-3xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <Globe size={20} className="ml-2 text-slate-400" />
                <input type="text" placeholder="TARGET URL" className="flex-1 bg-transparent border-none outline-none text-sm font-black uppercase tracking-widest" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
              <button onClick={handleStartMission} disabled={status === 'running' || !url} className={`rounded-3xl font-black text-xs uppercase text-white shadow-xl transition-all ${status === 'running' ? 'bg-emerald-600' : 'bg-blue-600 hover:scale-105 active:scale-95'}`}>
                {status === 'running' ? 'Mission Active' : 'Launch Mission'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          {activeSuiteId && <SaturationMonitor suiteId={activeSuiteId} isDark={isDark} missionMode={missionMode} missionGoal={missionGoal} testCases={testCases} suiteStatus={status} />}
          {testCases.length === 0 && status !== 'running' ? <StrategicHistory onReplay={setUrl} /> : <TacticalLog testCases={testCases} missionMode={missionMode} isDark={isDark} onViewEvidence={setSelectedEvidence} />}
        </div>
        <aside className="lg:col-span-4 space-y-6">
          <div className={`p-8 rounded-[40px] border ${isDark ? 'bg-[#080808] border-white/5' : 'bg-white border-slate-200 shadow-xl'}`}>
             <h2 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] mb-8 flex items-center gap-2"><BrainCircuit size={16} className="text-blue-500" /> Deployment Status</h2>
             <div className="space-y-4 opacity-80">
                <div className="p-4 rounded-2xl border border-white/5 bg-white/5"><p className="text-[8px] font-black text-slate-500 uppercase">Fleet</p><p className="text-xl font-black italic">Swarm Alpha-10</p></div>
                <div className="p-4 rounded-2xl border border-white/5 bg-white/5"><p className="text-[8px] font-black text-slate-500 uppercase">Analysis</p><p className="text-xl font-black italic">Mutation Enabled</p></div>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
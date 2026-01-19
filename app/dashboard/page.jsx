'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Globe, Zap, Target, ChevronUp } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useTheme } from '../contexts/ThemeContext';
import StrategicHistory from './StrategicHistory';
import ChaosTerminal from '../chaos-terminal/ChaosTerminal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// --- PÍLDORA PRO (RESTURADA) ---
function ChaosFloatingBubble({ total, success, alerts, onExpand, isDark }) {
  return (
    <div
      onClick={onExpand}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-6 px-8 py-4 rounded-full border cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in slide-in-from-bottom-10 duration-500 ${isDark ? 'bg-orange-600/20 border-orange-500/40' : 'bg-white border-orange-200'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500 blur-md animate-pulse opacity-50" />
          <Zap className="relative text-orange-500 fill-orange-500" size={18} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest italic">
          Chaos Mode <span className="text-orange-500">Active</span>
        </span>
      </div>
      <div className="h-4 w-[1px] bg-white/10" />
      <div className="flex gap-6">
        <div className="text-center">
          <p className="text-[7px] font-black text-slate-500 uppercase">Iter</p>
          <p className="text-sm font-black leading-none">{total}</p>
        </div>
        <div className="text-center">
          <p className="text-[7px] font-black text-slate-500 uppercase">Success</p>
          <p className="text-sm font-black leading-none text-emerald-500">{success}</p>
        </div>
        <div className="text-center">
          <p className="text-[7px] font-black text-slate-500 uppercase">Alerts</p>
          <p className="text-sm font-black leading-none text-orange-500">{alerts}</p>
        </div>
      </div>
      <div className="ml-2 p-1 rounded-full bg-white/5">
        <ChevronUp size={14} className="text-orange-500" />
      </div>
    </div>
  );
}

export default function MissionControlPage() {
  const [url, setUrl] = useState('');
  const [chaosOpen, setChaosOpen] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [status, setStatus] = useState('idle');
  const [missionMode, setMissionMode] = useState('scout');
  const [missionGoal, setMissionGoal] = useState('');
  const [activeSuiteId, setActiveSuiteId] = useState(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // --- LÓGICA DE REALTIME (CON FIX DE SCREENSHOTS) ---
  useEffect(() => {
    if (!activeSuiteId) return;

    const stepsChannel = supabase.channel(`steps-${activeSuiteId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'test_steps',
        filter: `suite_id=eq.${activeSuiteId}`
      }, (p) => {
        // IMPORTANTE: Mapeamos los nombres de la DB a lo que espera tu ChaosTerminal
        const newStep = {
          ...p.new,
          screenshot_url: p.new.screenshot_url, // Aseguramos que el link pase directo
          title: p.new.title,
          status: p.new.status
        };
        setTestCases(prev => [...prev, newStep]);
      })
      .subscribe();

    return () => { supabase.removeChannel(stepsChannel); };
  }, [activeSuiteId]);

  const handleStartMission = async () => {
    if (!url) return;
    setTestCases([]);
    setStatus('running');
    const { data: suite } = await supabase.from('test_suites').insert([{
      name: `${missionMode.toUpperCase()}: ${url}`,
      base_url: url,
      status: 'running'
    }]).select().single();

    if (suite) {
      setActiveSuiteId(suite.id);
      fetch(`/api/run-${missionMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, suite_id: suite.id, goal: missionGoal })
      });
    }
  };

  return (
    <div className={`min-h-screen pb-32 ${isDark ? 'bg-[#050505] text-white' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-6">

        {status === 'running' && missionMode === 'chaos' && (
          <ChaosFloatingBubble
            total={testCases.length}
            success={testCases.filter(s => s.status === 'success').length}
            alerts={testCases.filter(s => s.status === 'failed' || s.status === 'warning').length}
            onExpand={() => setChaosOpen(true)}
            isDark={isDark}
          />
        )}

        <ChaosTerminal
          open={chaosOpen}
          suiteId={activeSuiteId}
          onClose={() => setChaosOpen(false)}
        />

        <header className="py-12 border-b border-white/5 mb-12">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-500 tracking-[0.4em] mb-2">
            <Activity size={14} className="animate-pulse" /> Swarm Intel v2.0
          </div>
          <h1 className="text-6xl font-black tracking-tighter uppercase italic">
            Audit <span className="text-blue-600">Orchestrator</span>
          </h1>
        </header>

        {/* INPUTS SECTION */}
        <div className={`p-8 rounded-[50px] border mb-12 ${isDark ? 'bg-white/5 border-white/5 shadow-2xl' : 'bg-white shadow-xl'}`}>
          <div className="flex flex-col gap-8">
            <div className="flex gap-2 p-1.5 bg-black/40 w-fit rounded-full border border-white/5">
              {['scout', 'chaos', 'strike'].map((m) => (
                <button
                  key={m} onClick={() => setMissionMode(m)}
                  className={`px-8 py-3 rounded-full text-[10px] font-black uppercase transition-all ${missionMode === m
                      ? (m === 'scout' ? 'bg-blue-600' : m === 'chaos' ? 'bg-orange-600' : 'bg-purple-600 text-white')
                      : 'text-slate-500 hover:text-white'
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-[2] flex items-center gap-4 px-8 py-5 rounded-full border border-white/10 bg-black/20">
                <Globe size={18} className="text-slate-500" />
                <input
                  value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="TARGET URL..."
                  className="bg-transparent border-none outline-none text-xs font-black w-full uppercase tracking-widest text-white"
                />
              </div>

              {missionMode === 'strike' && (
                <div className="flex-1 flex items-center gap-4 px-8 py-5 rounded-full border border-purple-500/30 bg-purple-500/5 animate-in slide-in-from-left-4">
                  <Target size={18} className="text-purple-500" />
                  <input
                    value={missionGoal} onChange={(e) => setMissionGoal(e.target.value)}
                    placeholder="STRIKE GOAL..."
                    className="bg-transparent border-none outline-none text-xs font-black w-full uppercase tracking-widest text-purple-200"
                  />
                </div>
              )}

              <button
                onClick={handleStartMission}
                className="bg-blue-600 hover:bg-blue-500 px-12 py-5 rounded-full font-black text-[10px] uppercase transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-white"
              >
                Launch Swarm
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl">
          {status === 'running' && missionMode === 'chaos' ? (
            <div className="py-24 text-center">
              <Zap className="mx-auto text-orange-500 fill-orange-500 animate-bounce mb-8" size={80} />
              <h3 className="text-5xl font-black italic uppercase tracking-tighter mb-4">Chaos Active</h3>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">
                Check terminal for real-time uplink
              </p>
            </div>
          ) : (
            <StrategicHistory onReplay={setUrl} />
          )}
        </div>
      </div>
    </div>
  );
}
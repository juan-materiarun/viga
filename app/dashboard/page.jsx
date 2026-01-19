'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Globe, Zap, Target, ChevronUp, ScanLine, Crosshair, Coins, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import StrategicHistory from './StrategicHistory';
import ChaosTerminal from '../chaos-terminal/ChaosTerminal';
import AgentFloatingBubble from '../components/AgentFloatingBubble';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


export default function MissionControlPage() {
  const [url, setUrl] = useState('');
  const [chaosOpen, setChaosOpen] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [status, setStatus] = useState('idle');
  const [missionMode, setMissionMode] = useState('scout');
  const [missionGoal, setMissionGoal] = useState('');
  const [activeSuiteId, setActiveSuiteId] = useState(null);
  const [suiteStatus, setSuiteStatus] = useState('idle'); // idle, running, completed, failed
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isSaveInputOpen, setIsSaveInputOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const { theme } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const vigaBalance = profile?.vigas_balance;
  const isDark = theme === 'dark';

  useEffect(() => {
    if (user) refreshProfile();
  }, [user, status]); // Refetch when status changes (post-run)

  // --- LÓGICA DE REALTIME ---
  useEffect(() => {
    if (!activeSuiteId) return;

    // Suscribirse a Pasos de ejecución
    const stepsChannel = supabase.channel(`steps-${activeSuiteId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'test_steps',
        filter: `suite_id=eq.${activeSuiteId}`
      }, (p) => {
        const newStep = {
          ...p.new,
          screenshot_url: p.new.screenshot_url,
          title: p.new.title,
          status: p.new.status
        };
        setTestCases(prev => [...prev, newStep]);
      })
      .subscribe();

    // Suscribirse al Estado de la Suite (Notificación de fin)
    const suiteChannel = supabase.channel(`suite-status-${activeSuiteId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'test_suites',
        filter: `id=eq.${activeSuiteId}`
      }, (p) => {
        const newStatus = p.new.status;
        if (newStatus === 'completed' || newStatus === 'failed') {
          setSuiteStatus(newStatus);
          setStatus('idle'); // Liberamos el dashboard para otra run
          setShowCompletionModal(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(stepsChannel);
      supabase.removeChannel(suiteChannel);
    };
  }, [activeSuiteId]);

  const handleStartMission = async () => {
    if (!url) return;
    setTestCases([]);
    setStatus('running');
    setSuiteStatus('running');
    setShowCompletionModal(false);
    setChaosOpen(true); // Auto-open terminal on start

    // Create Suite
    const { data: suite } = await supabase.from('test_suites').insert([{
      name: `${missionMode.toUpperCase()}: ${url} ${missionGoal ? '(' + missionGoal + ')' : ''}`,
      base_url: url,
      status: 'running'
    }]).select().single();

    if (suite) {
      setActiveSuiteId(suite.id);
      fetch(`/api/run-${missionMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          suite_id: suite.id,
          goal: missionGoal,
          userId: user?.id
        })
      });
    }
  };

  const handleSaveAsSuite = async () => {
    if (!saveName) {
      setIsSaveInputOpen(true);
      return;
    }

    const { error } = await supabase.from('test_suites').update({
      name: `[REGRESSION] ${saveName}`,
      is_regression: true
    }).eq('id', activeSuiteId);

    if (!error) {
      setIsSaveInputOpen(false);
      setShowCompletionModal(false);
      setSaveName('');
    }
  };

  return (
    <div className={`min-h-screen pb-32 ${isDark ? 'bg-[#050505] text-white' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-6">

        {/* FEEDBACK BUBBLE (FOR ALL MODES) */}
        {status === 'running' && (
          <AgentFloatingBubble
            mode={missionMode}
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

        {/* MODAL DE FINALIZACIÓN */}
        <AnimatePresence>
          {showCompletionModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10001] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className={`w-full max-w-md p-8 rounded-[40px] border shadow-2xl ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${suiteStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                  {suiteStatus === 'completed' ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                </div>

                <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2">
                  Mission <span className={suiteStatus === 'completed' ? 'text-emerald-500' : 'text-red-500'}>{suiteStatus}</span>
                </h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                  The operative has finished the <span className="font-bold text-slate-300 uppercase">{missionMode}</span> protocol.
                  All evidence has been stored in the archives.
                </p>

                <div className="flex flex-col gap-3">
                  {isSaveInputOpen ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <input
                        autoFocus
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-[10px] uppercase font-black tracking-widest text-white outline-none focus:border-emerald-500"
                        placeholder="SUITE NAME (E.G. USER LOGIN)"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                      />
                      <button
                        onClick={handleSaveAsSuite}
                        className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                      >
                        Confirmar Guardado
                      </button>
                      <button
                        onClick={() => setIsSaveInputOpen(false)}
                        className="w-full py-4 rounded-2xl bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-widest"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => { setChaosOpen(true); setShowCompletionModal(false); }}
                        className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Review Evidence
                      </button>
                      {suiteStatus === 'completed' && (
                        <button
                          onClick={() => setIsSaveInputOpen(true)}
                          className="w-full py-4 rounded-2xl bg-emerald-600/20 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-lg shadow-emerald-600/10"
                        >
                          Save as Regression Suite
                        </button>
                      )}
                      <button
                        onClick={() => setShowCompletionModal(false)}
                        className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all"
                      >
                        Acknowledge
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="py-12 border-b border-white/5 mb-12 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-500 tracking-[0.4em] mb-2">
              <Activity size={14} className="animate-pulse" /> Swarm Intel v2.0
            </div>
            <h1 className="text-6xl font-black tracking-tighter uppercase italic">
              Audit <span className="text-blue-600">Orchestrator</span>
            </h1>
          </div>

          {vigaBalance !== undefined && vigaBalance !== null && (
            <div className={`px-6 py-3 rounded-2xl border flex items-center gap-3 backdrop-blur-xl animate-in slide-in-from-right-10 ${vigaBalance > 0
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}>
              <div className="relative">
                <div className="absolute inset-0 bg-current blur-md animate-pulse opacity-50" />
                <Coins size={20} className="relative" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Available Fuel</p>
                <p className="text-2xl font-black italic tabular-nums leading-none tracking-tight">{vigaBalance.toLocaleString()} <span className="text-xs not-italic font-bold opacity-60">VIGAS</span></p>
              </div>
            </div>
          )}
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
          {status === 'running' ? (
            <div className="py-24 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-8">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Mission In Progress
              </div>
              <Activity className="mx-auto text-slate-800 animate-pulse" size={40} />
            </div>
          ) : (
            <StrategicHistory onReplay={setUrl} />
          )}
        </div>
      </div>
    </div>
  );
}
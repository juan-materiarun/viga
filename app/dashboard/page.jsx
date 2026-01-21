'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Globe, Zap, Target, ChevronUp, Coins, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  const [missionMode, setMissionMode] = useState('chaos');
  const [missionGoal, setMissionGoal] = useState('');
  const [activeSuiteId, setActiveSuiteId] = useState(null);
  const [suiteStatus, setSuiteStatus] = useState('idle');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isSaveInputOpen, setIsSaveInputOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [notification, setNotification] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showCredentials, setShowCredentials] = useState(false);
  const { theme } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const vigaBalance = profile?.vigas_balance;
  const isDark = theme === 'dark';

  useEffect(() => {
    if (user) refreshProfile();
  }, [user, status]);

  useEffect(() => {
    if (!activeSuiteId) return;
    const stepsChannel = supabase.channel(`steps-${activeSuiteId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'test_steps', filter: `suite_id=eq.${activeSuiteId}` }, (p) => {
        setTestCases(prev => [...prev, { ...p.new }]);
      })
      .subscribe();
    const suiteChannel = supabase.channel(`suite-status-${activeSuiteId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'test_suites', filter: `id=eq.${activeSuiteId}` }, (p) => {
        if (['completed', 'failed'].includes(p.new.status)) {
          setSuiteStatus(p.new.status);
          setStatus('idle');
          setShowCompletionModal(true);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(stepsChannel);
      supabase.removeChannel(suiteChannel);
    };
  }, [activeSuiteId]);

  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleStartMission = async () => {
    if (!url) return;
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (!urlPattern.test(url)) {
      showNotify("Invalid URL", "error");
      return;
    }

    setTestCases([]);
    setStatus('running');
    setSuiteStatus('running');
    setShowCompletionModal(false);
    // setChaosOpen(true); // Don't open automatically
    showNotify("Agent Deployed to Background", "success");

    const { data: suite } = await supabase.from('test_suites').insert([{
      name: `${missionMode.toUpperCase()}: ${url} ${missionGoal ? '(' + missionGoal + ')' : ''}`,
      base_url: url,
      status: 'running'
    }]).select().single();

    if (suite) {
      setActiveSuiteId(suite.id);
      const response = await fetch(`/api/run-${missionMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          suite_id: suite.id,
          goal: missionGoal,
          userId: user?.id,
          credentials: (credentials.username || credentials.password) ? credentials : null
        })
      });

      const result = await response.json();

      // Check for insufficient funds
      if (!response.ok && result.insufficient_funds) {
        setStatus('idle');
        setSuiteStatus('idle');
        setChaosOpen(false);
        showNotify(result.error || 'Insufficient VIGAS to run this agent', 'error');
        // Delete the suite since we didn't actually start
        await supabase.from('test_suites').delete().eq('id', suite.id);
        return;
      }

      if (!response.ok) {
        setStatus('idle');
        setSuiteStatus('idle');
        setChaosOpen(false);
        showNotify(result.error || 'Failed to start agent', 'error');
        await supabase.from('test_suites').delete().eq('id', suite.id);
        return;
      }
    }
  };

  const handleSaveAsSuite = async () => {
    if (!saveName) { setIsSaveInputOpen(true); return; }
    const { error } = await supabase.from('test_suites').update({
      name: `[REGRESSION] ${saveName}`,
      is_regression: true
    }).eq('id', activeSuiteId);
    if (!error) { setIsSaveInputOpen(false); setShowCompletionModal(false); setSaveName(''); }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#050505] text-white' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-10 left-1/2 -translate-x-1/2 z-[300]">
              <div className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${notification.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest">{notification.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {status === 'running' && activeSuiteId && (
          <AgentFloatingBubble
            mode={missionMode}
            total={testCases.length}
            success={testCases.filter(s => s.status === 'success').length}
            alerts={testCases.filter(s => s.status === 'failed' || s.status === 'warning').length}
            onExpand={() => setChaosOpen(true)}
            isDark={isDark}
          />
        )}

        <ChaosTerminal open={chaosOpen} suiteId={activeSuiteId} onClose={() => setChaosOpen(false)} />

        <AnimatePresence>
          {showCompletionModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10001] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className={`w-full max-w-md p-8 rounded-[40px] border shadow-2xl ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Run {suiteStatus}</h3>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setShowCompletionModal(false)} className="w-full py-4 rounded-xl bg-blue-600 text-white font-black text-xs uppercase hover:bg-blue-500">Close</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER */}
        <header className="mb-16">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600">⚡ VIGA Core v3.1</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-6xl font-black tracking-tighter uppercase italic leading-none">
              AUDIT <span className="text-blue-600">ORCHESTRATOR</span>
            </h1>
            <div className={`px-8 py-4 rounded-2xl border ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Available Fuel</p>
              <p className="text-3xl font-black italic tabular-nums text-emerald-600">{vigaBalance?.toLocaleString() || 0} <span className="text-sm not-italic opacity-60">VIGAS</span></p>
            </div>
          </div>
        </header>

        {/* HORIZONTAL INPUT LAYOUT */}
        <div className={`p-1 rounded-[24px] border mb-16 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-xl'}`}>
          <div className={`rounded-[20px] p-6 ${isDark ? 'bg-[#0A0A0A]' : 'bg-slate-50/50'}`}>

            {/* MODE SELECTOR */}
            <div className="flex items-center gap-2 mb-6">
              {['chaos', 'strike'].map((m) => (
                <button
                  key={m} onClick={() => setMissionMode(m)}
                  className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${missionMode === m
                    ? (m === 'chaos' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-purple-600 text-white shadow-lg shadow-purple-600/20')
                    : (isDark ? 'text-slate-500 hover:text-white bg-white/5' : 'text-slate-400 hover:text-slate-800 bg-slate-100')
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* HORIZONTAL GRID */}
            <div className="flex gap-3">
              {/* LEFT SIDE: INPUTS */}
              <div className="flex-1 flex flex-col gap-3">
                {/* URL */}
                <div className={`flex items-center gap-4 px-5 py-3 rounded-xl border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200'}`}>
                  <Globe size={16} className={isDark ? "text-slate-600" : "text-slate-400"} />
                  <input
                    value={url} onChange={(e) => setUrl(e.target.value)}
                    placeholder="TARGET URL..."
                    className={`bg-transparent border-none outline-none text-sm font-black w-full uppercase tracking-widest placeholder-slate-500 ${isDark ? 'text-white' : 'text-slate-800'}`}
                  />
                </div>

                {/* STRIKE GOAL */}
                <AnimatePresence>
                  {missionMode === 'strike' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className={`flex items-center gap-4 px-5 py-3 rounded-xl border ${isDark ? 'bg-purple-500/5 border-purple-500/20' : 'bg-purple-50 border-purple-200'}`}>
                        <Target size={16} className="text-purple-500" />
                        <input
                          value={missionGoal} onChange={(e) => setMissionGoal(e.target.value)}
                          placeholder="STRIKE GOAL..."
                          className={`bg-transparent border-none outline-none text-xs font-black w-full uppercase tracking-widest ${isDark ? 'text-purple-200 placeholder-purple-500/30' : 'text-purple-900 placeholder-purple-300'}`}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CREDENTIALS */}
                <div className={`overflow-hidden rounded-xl border transition-all ${showCredentials ? (isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white') : 'border-transparent'}`}>
                  <button
                    onClick={() => setShowCredentials(!showCredentials)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <span className="flex items-center gap-2">
                      {showCredentials ? <ChevronUp size={10} /> : <Coins size={10} className="rotate-45" />}
                      {showCredentials ? 'Hide Auth' : 'Add Credentials'}
                    </span>
                  </button>
                  <AnimatePresence>
                    {showCredentials && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <div className="p-3 pt-0 grid grid-cols-2 gap-3">
                          <input value={credentials.username} onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))} placeholder="USERNAME" className={`w-full bg-transparent px-3 py-2 rounded-lg border text-[10px] font-bold outline-none uppercase ${isDark ? 'bg-black/20 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                          <input type="password" value={credentials.password} onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))} placeholder="PASSWORD" className={`w-full bg-transparent px-3 py-2 rounded-lg border text-[10px] font-bold outline-none uppercase ${isDark ? 'bg-black/20 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT SIDE: DEPLOY BUTTON */}
              <button
                onClick={handleStartMission}
                className="w-48 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:translate-y-[-1px] flex items-center justify-center gap-3 group self-start"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Deploy Agent</span>
                <Zap size={14} className="fill-white group-hover:scale-110 transition-transform" />
              </button>
            </div>

          </div>
        </div>

        <div className="max-w-5xl mx-auto">
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
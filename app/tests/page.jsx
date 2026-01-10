'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle2, Clock, Beaker, AlertTriangle, ChevronRight, Filter } from 'lucide-react';
import './tests.css';

export default function TestsPage() {
  const testSuites = [
    { name: 'User Authentication', status: 'passing', tests: 24, duration: '2.3s', lastRun: '2 min ago' },
    { name: 'Payment Flow', status: 'passing', tests: 18, duration: '3.1s', lastRun: '15 min ago' },
    { name: 'Dashboard Components', status: 'warning', tests: 32, duration: '4.2s', lastRun: '1 hour ago' },
    { name: 'API Integration', status: 'passing', tests: 45, duration: '5.7s', lastRun: '3 hours ago' },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'passing': return 'status-passing';
      case 'warning': return 'status-warning';
      case 'failing': return 'status-failing';
      default: return 'status-idle';
    }
  };

  return (
    <div className="p-10 max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="flex justify-between items-end mb-10">
        <div className="header-left">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2">Testing Engine / Suites</div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Test Suites</h1>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">Validación de flujos críticos de la plataforma.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase tracking-widest border border-white/10 transition-all">
            <Filter size={14}/> Filter
          </button>
          <button className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl">
            <Play size={14} fill="currentColor" /> Run All Suites
          </button>
        </div>
      </header>

      <div className="space-y-3">
        {testSuites.map((suite, index) => (
          <motion.div
            key={suite.name}
            className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 grid grid-cols-[1.5fr_1fr_1fr_40px] items-center hover:border-blue-500/30 hover:bg-[#0F0F0F] transition-all group cursor-pointer"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <div className="flex items-center gap-4">
              <div className={`w-1 h-10 rounded-full ${suite.status === 'passing' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide group-hover:text-blue-400 transition-colors">{suite.name}</h3>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Last run: {suite.lastRun}</span>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold font-mono uppercase">
                <Beaker size={14} />
                <span>{suite.tests} Tests</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold font-mono uppercase">
                <Clock size={14} />
                <span>{suite.duration}</span>
              </div>
            </div>

            <div className="flex justify-center">
              <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                suite.status === 'passing' 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}>
                {suite.status === 'passing' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {suite.status}
              </span>
            </div>

            <div className="flex justify-end text-slate-700 group-hover:text-blue-500 transition-all">
              <ChevronRight size={20} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
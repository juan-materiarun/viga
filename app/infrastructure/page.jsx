'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ShieldCheck, AlertCircle } from 'lucide-react';
import './infrastructure.css';

export default function InfrastructurePage() {
  const services = [
    { name: 'Web Server', status: 'healthy', uptime: '99.9%', cpu: '12%', memory: '2.3GB', type: 'Edge' },
    { name: 'Database', status: 'healthy', uptime: '99.8%', cpu: '8%', memory: '4.1GB', type: 'Storage' },
    { name: 'Cache Layer', status: 'healthy', uptime: '100%', cpu: '3%', memory: '512MB', type: 'Redis' },
    { name: 'API Gateway', status: 'warning', uptime: '98.5%', cpu: '45%', memory: '1.8GB', type: 'Routing' },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'healthy': return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      case 'warning': return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
      case 'critical': return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
      default: return { color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
    }
  };

  return (
    <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      <header className="flex justify-between items-start mb-10">
        <div>
          <div className="inline-block px-2 py-1 rounded bg-blue-600/10 text-blue-500 text-[9px] font-black uppercase tracking-[0.2em] mb-3 border border-blue-600/20">
            Network Live
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Infrastructure Nodes</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Métricas de rendimiento y salud de los servicios conectados.
          </p>
        </div>
        <button className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-black px-5 py-2.5 rounded-xl uppercase tracking-widest border border-white/10 transition-all">
          Recargar Datos
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map((service, index) => {
          const style = getStatusStyle(service.status);
          return (
            <motion.div
              key={service.name}
              className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 flex flex-col hover:border-white/10 transition-all group"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="flex justify-between items-center mb-6">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase border ${style.bg} ${style.color} ${style.border}`}>
                  {service.status === 'healthy' ? <ShieldCheck size={12}/> : <AlertCircle size={12}/>}
                  {service.status}
                </div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{service.type}</span>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-black text-white uppercase tracking-tight mb-6">{service.name}</h3>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-500">CPU Load</span>
                      <span className="text-white">{service.cpu}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: service.cpu }} />
                    </div>
                  </div>

                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">Uptime</span>
                    <span className="text-emerald-500 font-mono font-bold">{service.uptime}</span>
                  </div>

                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">RAM Usage</span>
                    <span className="text-white">{service.memory}</span>
                  </div>
                </div>
              </div>

              <button className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-white transition-all">
                View Logs <ArrowUpRight size={14} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
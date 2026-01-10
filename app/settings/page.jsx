'use client';
import React, { useState } from 'react';
import { Slack, Save, Bell, Shield, Zap } from 'lucide-react';

export default function SettingsPage() {
  // Estado para los toggles (ejemplo de funcionalidad Startup)
  const [settings, setSettings] = useState({
    autoHeal: true,
    deepScan: false,
    weeklyReports: true
  });

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-10 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Settings</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Configure su ecosistema de trabajo</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
          <Save size={14}/> Save Changes
        </button>
      </div>

      <div className="space-y-6">
        {/* Integración con Slack - Estilo Startup */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-8 flex items-center justify-between shadow-2xl hover:border-white/10 transition-all">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-[#4A154B] rounded-2xl flex items-center justify-center shadow-lg">
              <Slack size={30} color="white" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-sm text-white">Slack Integration</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Reciba alertas de infraestructura en tiempo real</p>
            </div>
          </div>
          <button className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
            Connect Slack
          </button>
        </div>

        {/* Notificaciones y Preferencias */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-8 shadow-2xl">
           <div className="flex items-center gap-2 mb-8 text-blue-500">
             <Zap size={16} />
             <h3 className="font-black uppercase tracking-widest text-sm text-white">General Preferences</h3>
           </div>
           
           <div className="space-y-2">
              <ToggleRow 
                label="Auto-Heal Nodes" 
                active={settings.autoHeal} 
                onClick={() => toggleSetting('autoHeal')}
                desc="Reparación automática de instancias fallidas"
              />
              <ToggleRow 
                label="Deep Scan Mode" 
                active={settings.deepScan} 
                onClick={() => toggleSetting('deepScan')}
                desc="Análisis exhaustivo de vulnerabilidades cada 24hs"
              />
              <ToggleRow 
                label="Weekly Reports" 
                active={settings.weeklyReports} 
                onClick={() => toggleSetting('weeklyReports')}
                desc="Resumen ejecutivo enviado a su casilla de correo"
              />
           </div>
        </div>

        {/* Danger Zone */}
        <div className="p-8 rounded-2xl border border-red-500/10 bg-red-500/[0.02]">
           <h3 className="font-black uppercase tracking-widest text-[10px] text-red-500 mb-2">Danger Zone</h3>
           <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Borrar todos los logs de auditoría y resets de nodos</p>
           <button className="text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
             Purge All Data
           </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, active, onClick, desc }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
      <div>
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-200 block">{label}</span>
        <span className="text-[9px] font-bold uppercase text-slate-600">{desc}</span>
      </div>
      <div 
        onClick={onClick}
        className={`w-11 h-6 rounded-full relative transition-all duration-300 cursor-pointer ${active ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-800'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${active ? 'left-6' : 'left-1'}`} />
      </div>
    </div>
  );
}
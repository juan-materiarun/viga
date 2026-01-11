'use client';

import React, { useState, useEffect } from 'react';
import {
  Slack,
  Save,
  Zap,
  Key,
  Loader2,
  AlertCircle,
  Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext'; // BIEN: Importar del contexto directamente
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    autoHeal: true,
    deepScan: false,
    weeklyReports: true,
    apiKey: ''
  });

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('settings, groq_key')
        .eq('id', user.id)
        .single();

      if (data) {
        setSettings({
          autoHeal: data.settings?.autoHeal ?? true,
          deepScan: data.settings?.deepScan ?? false,
          weeklyReports: data.settings?.weeklyReports ?? true,
          apiKey: data.groq_key || ''
        });
      }
      setLoading(false);
    }
    loadSettings();
  }, [user]);

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { autoHeal, deepScan, weeklyReports, apiKey } = settings;
    await supabase.from('profiles').upsert({
      id: user.id,
      groq_key: apiKey,
      settings: { autoHeal, deepScan, weeklyReports },
      updated_at: new Date().toISOString()
    });
    setTimeout(() => setIsSaving(false), 800);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
      <Loader2 className="animate-spin text-blue-500" size={32} />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Syncing Node Preferences</span>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-8 pb-20"
    >
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2 italic">System Control / Identity</div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white transition-colors duration-75">Settings</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Configure su ecosistema de auditoría automatizada.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all flex items-center gap-3 active:scale-95"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>}
          {isSaving ? 'Synchronizing...' : 'Commit Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* GROQ CONFIGURATION */}
        <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/5 rounded-[32px] p-8 relative overflow-hidden group transition-colors duration-75 shadow-sm dark:shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-slate-900 dark:text-white">
            <Key size={80} />
          </div>
          <div className="flex items-center gap-2 mb-8 text-blue-500 relative z-10">
            <Key size={16} />
            <h3 className="font-black uppercase tracking-widest text-sm text-slate-900 dark:text-white italic transition-colors duration-75">Intelligence Provider</h3>
          </div>
          
          <div className="space-y-4 relative z-10">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Groq API Key</label>
              <input 
                type="password" 
                value={settings.apiKey}
                onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
                className="w-full max-w-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-xs font-mono text-blue-600 dark:text-blue-400 outline-none focus:border-blue-500 transition-all"
                placeholder="gsk_viga_protocol_x882"
              />
              <p className="text-[9px] font-bold uppercase text-slate-600 mt-2 flex items-center gap-1 italic">
                <Shield size={10} /> La clave se almacena bajo cifrado AES-256 en su nodo privado.
              </p>
            </div>
          </div>
        </div>

        {/* PREFERENCIAS GENERALES */}
        <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/5 rounded-[32px] p-8 transition-colors duration-75 shadow-sm dark:shadow-2xl">
           <div className="flex items-center gap-2 mb-8 text-blue-500">
             <Zap size={16} />
             <h3 className="font-black uppercase tracking-widest text-sm text-slate-900 dark:text-white italic transition-colors duration-75">Node Protocols</h3>
           </div>
           
           <div className="space-y-2">
              <ToggleRow 
                label="Auto-Heal Nodes" 
                active={settings.autoHeal} 
                onClick={() => toggleSetting('autoHeal')}
                desc="Reparación automática de scripts fallidos por cambios en el DOM"
              />
              <ToggleRow 
                label="Deep Scan Mode" 
                active={settings.deepScan} 
                onClick={() => toggleSetting('deepScan')}
                desc="Auditoría multicanal exhaustiva (Mobile / Desktop)"
              />
              <ToggleRow 
                label="Weekly Analytics" 
                active={settings.weeklyReports} 
                onClick={() => toggleSetting('weeklyReports')}
                desc="Reporte ejecutivo de salud del software enviado los lunes"
              />
           </div>
        </div>

        {/* SLACK INTEGRATION */}
        <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/5 rounded-[32px] p-8 flex items-center justify-between transition-colors duration-75 shadow-sm dark:shadow-2xl border-l-4 border-l-[#4A154B]">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-[#4A154B] rounded-2xl flex items-center justify-center shadow-lg">
              <Slack size={30} color="white" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-sm text-slate-900 dark:text-white italic transition-colors duration-75">Slack Dispatcher</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Reciba alertas de bugs críticos en su canal de ingeniería.</p>
            </div>
          </div>
          <button className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-80 transition-all active:scale-95">
            Connect Workspace
          </button>
        </div>

        {/* DANGER ZONE */}
        <div className="p-8 rounded-[32px] border border-red-500/20 bg-red-50/50 dark:bg-red-500/[0.01] flex items-center justify-between group hover:border-red-500/40 transition-all">
           <div className="flex items-center gap-4">
             <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
               <AlertCircle size={20} />
             </div>
             <div>
               <h3 className="font-black uppercase tracking-widest text-[10px] text-red-500 mb-1">Critical Destruction Zone</h3>
               <p className="text-[10px] text-slate-600 font-bold uppercase italic">Purgar historial de misiones y resetear tokens de inteligencia.</p>
             </div>
           </div>
           <button className="bg-transparent border border-red-500/20 text-red-500/50 hover:bg-red-500 hover:text-white px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all">
             Purge All Data
           </button>
        </div>
      </div>
    </motion.div>
  );
}

function ToggleRow({ label, active, onClick, desc }) {
  return (
    <div className="flex items-center justify-between py-5 border-b border-slate-100 dark:border-white/5 last:border-0 group transition-colors duration-75">
      <div className="flex-1">
        <span className="text-[11px] font-black uppercase tracking-widest block group-hover:text-blue-500 transition-colors duration-300 text-slate-800 dark:text-slate-200">
          {label}
        </span>
        <span className="text-[9px] font-bold uppercase text-slate-500 tracking-tighter">{desc}</span>
      </div>
      <div 
        onClick={onClick}
        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${
          active ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-slate-200 dark:bg-slate-800'
        }`}
      >
        <motion.div 
          animate={{ x: active ? 26 : 4 }}
          transition={{ type: "spring", stiffness: 700, damping: 35 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg will-change-transform" 
        />
      </div>
    </div>
  );
}
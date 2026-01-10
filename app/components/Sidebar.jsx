'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Beaker, 
  Activity, 
  Settings, 
  Shield, 
  ChevronRight,
  LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';

const menuItems = [
  { name: 'Mission Control', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { name: 'Test Archives', path: '/tests', icon: <Beaker size={18} /> },
  { name: 'Infrastructure', path: '/infrastructure', icon: <Activity size={18} /> },
  { name: 'Settings', path: '/settings', icon: <Settings size={18} /> },
];

export default function Sidebar({ children }) {
  const pathname = usePathname();

  // No mostramos el sidebar en la landing page (/)
  if (pathname === '/') return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-[#050505] text-white">
      {/* Sidebar Fijo */}
      <aside className="w-64 border-r border-white/5 bg-[#080808] flex flex-col p-6 sticky top-0 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-12">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase">VIGA</h1>
            <p className="text-[7px] font-black text-blue-500 tracking-[0.3em] uppercase -mt-1">Secure Core</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div className={`
                  flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group
                  ${isActive ? 'bg-blue-600/10 border border-blue-500/20 text-blue-500' : 'text-slate-500 hover:text-white hover:bg-white/5 border border-transparent'}
                `}>
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-[10px] font-black uppercase tracking-widest">{item.name}</span>
                  </div>
                  {isActive && (
                    <motion.div layoutId="active" className="w-1 h-4 bg-blue-500 rounded-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User / Exit */}
        <div className="pt-6 border-t border-white/5">
          <button className="w-full flex items-center justify-between px-4 py-3 text-slate-600 hover:text-red-500 transition-colors group">
            <div className="flex items-center gap-3">
              <LogOut size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Terminate Session</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-full">
            {children}
        </div>
      </main>
    </div>
  );
}
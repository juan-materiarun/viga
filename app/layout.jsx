'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Beaker, Box, Settings, ChevronRight, Moon, Sun } from 'lucide-react';
// IMPORTANTE: Asegurate de que la ruta al context sea la correcta
import { ThemeProvider, useTheme } from './contexts/ThemeContext'; 
import './globals.css';

// Creamos un componente interno para poder usar useTheme() sin errores
function LayoutContent({ children }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { icon: <LayoutGrid size={18}/>, label: 'Overview', href: '/dashboard' },
    { icon: <Beaker size={18}/>, label: 'Test Suites', href: '/tests' },
    { icon: <Box size={18}/>, label: 'Infrastructure', href: '/infrastructure' },
    { icon: <Settings size={18}/>, label: 'Settings', href: '/settings' }
  ];

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${theme === 'dark' ? 'bg-[#030303] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* SIDEBAR */}
      <aside className={`w-64 border-r ${theme === 'dark' ? 'border-white/5 bg-[#080808]' : 'border-slate-200 bg-white'} flex flex-col shrink-0`}>
        <div className="p-6 h-16 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <span className="text-white font-black text-sm">V</span>
            </div>
            <span className="font-bold tracking-tighter text-xl uppercase">VIGA</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer
                ${pathname === item.href 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}>
                {item.icon} {item.label}
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      {/* MAIN PANEL */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className={`h-16 border-b ${theme === 'dark' ? 'border-white/5 bg-[#080808]/50' : 'border-slate-200 bg-white/50'} backdrop-blur-md px-8 flex items-center justify-between`}>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Link href="/dashboard" className="hover:text-blue-500 transition-colors">Platform</Link> 
            <ChevronRight size={12}/> 
            <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
              {pathname === '/dashboard' ? 'Overview' : pathname.replace('/', '')}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={toggleTheme} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-all">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <span className="text-[10px] font-black uppercase text-slate-400">Admin</span>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">A</div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

// El Root Layout envuelve a LayoutContent con el Provider
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <LayoutContent>
            {children}
          </LayoutContent>
        </ThemeProvider>
      </body>
    </html>
  );
}
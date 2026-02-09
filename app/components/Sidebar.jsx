'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { supabase } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  FlaskConical,
  FolderKanban,
  Settings,
  Database,
  Coins,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  TestTube2,
  Globe,
  Library
} from 'lucide-react';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user, profile } = useAuth();

  const { collapsed, toggleSidebar } = useSidebar();

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.tests'), href: '/tests', icon: FlaskConical },
    { name: 'INFRASTRUCTURE', href: '/infrastructure', icon: FileCheck },
    { name: t('nav.environment'), href: '/environment', icon: Database },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ];

  const isActive = (href) => pathname === href || pathname?.startsWith(href + '/');

  const displayName = profile?.company_name || user?.email?.split('@')[0]?.toUpperCase() || 'USER';
  const displayEmail = user?.email || 'user@viga.com';
  const displayInitials = profile?.avatar_url ? null : (user?.email?.[0]?.toUpperCase() || 'U');
  const displayTokens = profile?.vigas_balance || 0;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col transition-[width] duration-300 z-50 ${collapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 w-6 h-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] z-50 shadow-sm cursor-pointer transition-transform hover:scale-110"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo Area */}
      <div className={`h-24 flex items-center border-b border-[var(--border-color)] overflow-hidden shrink-0 transition-all duration-300 ${collapsed ? 'justify-center' : 'justify-start pl-6'}`}>
        <Link href="/dashboard" className="block transition-all duration-300">
          <div className={`transition-all duration-300 relative ${collapsed ? 'w-10 h-10' : 'w-40 h-12'}`}>
            <Image
              src={theme === 'dark' ? '/VIGA-blacklogo.png' : '/VIGA-lightlogo.png'}
              alt="VIGA"
              fill
              className={`object-contain ${collapsed ? '' : 'object-left'}`}
            />
          </div>
        </Link>
      </div>

      {/* Profile Area */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out border-b border-[var(--border-color)] ${collapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0 shadow-sm">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                displayInitials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-[var(--text-primary)] truncate">{displayName}</p>
              <p className="text-sm text-[var(--text-muted)] truncate">{displayEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-color)]">
            <Coins size={18} className="text-[var(--accent-primary)]" />
            <span className="text-base font-bold text-[var(--text-primary)]">{displayTokens}</span>
            <span className="text-sm text-[var(--text-muted)] ml-auto">{t('common.tokens')}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
        {[{ name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: 'Performance', href: '/performance', icon: Globe },
        { name: 'API Lab', href: '/api-lab', icon: TestTube2 },
        { name: 'Biblioteca', href: '/library', icon: Library },
        { name: 'INFRASTRUCTURE', href: '/infrastructure', icon: FileCheck },
        { name: t('nav.environment'), href: '/environment', icon: Database },
        { name: t('nav.settings'), href: '/settings', icon: Settings }].map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.name : ''}
              className={`
                flex items-center h-10 rounded-lg transition-all duration-200 group relative
                ${collapsed ? 'justify-center px-0' : 'justify-start px-3'}
                ${active
                  ? 'bg-[var(--accent-primary)] text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }
              `}
            >
              {/* Icon Container fixed width to prevent jump */}
              <div className="w-6 flex justify-center items-center shrink-0">
                <Icon size={18} className={`transition-transform duration-300 ${active ? 'text-white' : 'text-[var(--accent-primary)] group-hover:scale-110'}`} />
              </div>

              {/* Text Label */}
              <span className={`whitespace-nowrap ml-3 font-medium text-sm transition-all duration-300 origin-left ${collapsed ? 'w-0 scale-0 opacity-0' : 'w-auto scale-100 opacity-100'}`}>
                {item.name}
              </span>

              {/* Tooltip */}
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-base)] text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-xl font-bold">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border-color)]">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/login');
          }}
          className={`w-full flex items-center h-10 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 group ${collapsed ? 'justify-center' : 'justify-start px-3 gap-3'}`}
          title="Cerrar sesión"
        >
          <LogOut size={20} className="group-hover:text-red-500 shrink-0" />
          <span className={`font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto'}`}>
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  );
}
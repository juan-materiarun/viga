'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, Beaker, Box, Settings, ChevronRight, Moon, Sun, LogOut, ScanLine, X, Check, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useAuth } from '../contexts/AuthContext.js';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase.js';

export default function LayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Avatar Upload States
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Formato no soportado (Usa JPG, PNG o WebP)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Imagen demasiado grande (Máx 2MB)');
      return;
    }

    setUploadError('');
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setUploadModalOpen(true);
  };

  const confirmUpload = async () => {
    if (!selectedFile || !user) return;
    setIsUploading(true);
    setUploadError('');

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`; // Organized folder

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      closeModal();
    } catch (error) {
      console.error('Avatar upload error:', error);
      setUploadError('Error al subir la imagen. Intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const closeModal = () => {
    setUploadModalOpen(false);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const isPublicPage = pathname === '/' || pathname === '/login';

  if (isPublicPage) {
    return (
      <main className={`w-full min-h-screen relative transition-none ${theme === 'dark' ? 'bg-[#030303] text-white' : 'bg-white text-slate-900'}`}>
        <AnimatePresence mode="wait">
          <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    );
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-none ${theme === 'dark' ? 'bg-[#030303] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>

      {/* SIDEBAR */}
      <aside className={`w-72 border-r transition-none ${theme === 'dark' ? 'border-white/5 bg-[#080808]' : 'border-slate-200 bg-white'} flex flex-col shrink-0 z-20`}>
        <div className="p-8 h-24 flex items-center">
          <Link href="/dashboard" className="relative w-40 h-12 group transition-transform active:scale-95">
            <Image
              src={theme === 'dark' ? '/VIGA-blacklogo.png' : '/VIGA-lightlogo.png'}
              alt="VIGA Logo"
              fill
              className="object-contain object-left transition-none"
              priority
            />
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {[
            { icon: <LayoutGrid size={18} />, label: 'Overview', href: '/dashboard' },
            { icon: <Beaker size={18} />, label: 'Test Suites', href: '/tests' },
            { icon: <Box size={18} />, label: 'Infrastructure', href: '/infrastructure' },
            { icon: <Settings size={18} />, label: 'Settings', href: '/settings' }
          ].map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} prefetch={true}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-none
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20'
                    : 'text-slate-500 hover:text-blue-500 hover:bg-blue-500/5'}`}>
                  {item.icon} {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={18} /> Terminate
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 relative h-screen transition-none">
        <header className={`h-16 border-b transition-none ${theme === 'dark' ? 'border-white/5 bg-[#080808]/50' : 'border-slate-200 bg-white/50'} backdrop-blur-md px-8 flex items-center justify-between z-10`}>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
            <span>Platform</span>
            <ChevronRight size={10} className="text-blue-600" />
            <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
              {pathname.substring(1) || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={toggleTheme} className={`p-2 rounded-xl border transition-none ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="text-right transition-none">
                <p className={`text-[10px] font-black uppercase leading-none mb-1 transition-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {profile?.company_name || user?.email?.split('@')[0] || 'Operator'}
                </p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                  ID: {user?.id?.substring(0, 8)}
                </p>
              </div>
              <div className="relative group cursor-pointer">
                <div className="w-10 h-10 rounded-2xl overflow-hidden bg-blue-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-600/20 transition-transform active:scale-95">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    user?.email?.[0].toUpperCase() || 'V'
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/jpeg,image/png,image/webp"
                    />
                    <ScanLine size={14} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="p-10"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* UPLOAD MODAL */}
      <AnimatePresence>
        {uploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-sm overflow-hidden rounded-[32px] border ${theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'} shadow-2xl`}
            >
              <div className="p-8 text-center">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Edit Profile Picture</h3>
                  <button onClick={closeModal} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500">
                    <X size={16} />
                  </button>
                </div>

                <div className="relative mx-auto w-32 h-32 mb-8">
                  <div className="w-full h-full rounded-[40px] overflow-hidden border-2 border-blue-600/30 p-1">
                    <img src={previewUrl} className="w-full h-full object-cover rounded-[32px]" alt="Preview" />
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 rounded-[32px] flex items-center justify-center backdrop-blur-sm">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-8">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Optimized for PNG, JPG, WebP
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                    Max size: 2MB | Best fit: Square (1:1)
                  </p>
                </div>

                {uploadError && (
                  <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{uploadError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={isUploading}
                    onClick={closeModal}
                    className="py-4 rounded-2xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isUploading}
                    onClick={confirmUpload}
                    className="py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    {isUploading ? 'Saving...' : (
                      <>
                        Save <Check size={12} className="group-hover:scale-125 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
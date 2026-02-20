'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useAuth } from '../contexts/AuthContext.js';

import Loader from './Loader';

export default function LayoutContent({ children }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { loading: authLoading } = useAuth();
  const isPublicPage = pathname === '/' || pathname === '/login';

  const containerClasses = isPublicPage
    ? "w-full min-h-screen"
    : "w-full min-h-screen";

  return (
    <div className={`relative flex flex-col ${containerClasses}`}>

      {/* Loader Overlay: Fixed para cubrir toda la pantalla incluyendo sidebar */}
      <AnimatePresence>
        {authLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99999]"
          >
            <Loader fullScreen size="xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido Real */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="min-h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div >
  );
}
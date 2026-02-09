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

  // Estado local para controlar el loader de transición
  const [pageLoading, setPageLoading] = useState(false);

  // Efecto para manejar navegación - sin delays artificiales
  useEffect(() => {
    // Activamos loader al cambiar de ruta
    setPageLoading(true);

    // Desactivamos inmediatamente (solo para transición visual suave)
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  const showLoader = authLoading || pageLoading;
  const isPublicPage = pathname === '/' || pathname === '/login';

  const containerClasses = isPublicPage
    ? "w-full min-h-screen"
    : "w-full min-h-screen";

  return (
    <div className={`relative flex flex-col ${containerClasses}`}>

      {/* Loader Overlay: Fixed para cubrir toda la pantalla incluyendo sidebar */}
      <AnimatePresence>
        {showLoader && (
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
      <AnimatePresence mode="wait">
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
    </div>
  );
}
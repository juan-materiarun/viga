'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  // 1. Carga inicial (Solo corre una vez al montar)
  useEffect(() => {
    const savedTheme = localStorage.getItem('viga-theme');

    // Si hay tema guardado, lo usamos. Si no, default dark.
    if (savedTheme) {
      setTheme(savedTheme);
    }
    setMounted(true); // Marcamos que ya leímos la config
  }, []);

  // 2. Aplicación y Guardado (Solo si ya montamos)
  useEffect(() => {
    if (!mounted) return; // Evita sobrescribir LS en el primer render

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // CRITICAL: Esto es lo que lee globals.css ([data-theme="light"])
    root.setAttribute('data-theme', theme);

    localStorage.setItem('viga-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
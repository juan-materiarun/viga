'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  // Carga inicial
  useEffect(() => {
    const savedTheme = localStorage.getItem('viga-theme') || 'dark';
    setTheme(savedTheme);
  }, []);

  // Aplicación del tema
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Quitamos ambas para no duplicar y agregamos la correcta
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Mantenemos esto por si usas variables CSS manuales
    root.setAttribute('data-theme', theme);
    
    localStorage.setItem('viga-theme', theme);
  }, [theme]);

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
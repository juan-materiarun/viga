'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTheme } from './contexts/ThemeContext';
import { Shield, Zap, Cpu, Globe, ArrowRight, Check } from 'lucide-react';

export default function LandingPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-[#030303]" />;

  const logoSrc = theme === 'dark' ? '/VIGA-blacklogo.png' : '/VIGA-lightlogo.png';

  // Configuración de resortes para que no sea "duro"
  const springTransition = {
    type: "spring",
    stiffness: 100,
    damping: 20,
    mass: 1
  };

  return (
    // IMPORTANTE: Asegúrate de que este div no tenga overflow-hidden
    <div className={`relative w-full ${theme === 'dark' ? 'bg-[#030303] text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="max-w-7xl mx-auto px-6 h-24 flex justify-between items-center">
          <Link href="/" className="relative w-48 h-16 hover:scale-105 transition-all duration-500">
            <Image 
              src={logoSrc} 
              alt="VIGA Logo" 
              fill 
              className="object-contain object-left"
              priority
            />
          </Link>
          
          <div className="hidden md:flex items-center gap-10">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
            <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20 active:scale-95">
              Initialize System
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-64 pb-32 px-6 flex flex-col items-center">
        {/* Glow de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[150px] rounded-full -z-10" />

        <div className="max-w-7xl mx-auto text-center flex flex-col items-center">
          {/* LOGO GIGANTE CENTRAL CON SPRING ANIMATION */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.1 }}
            className="relative w-[85vw] max-w-[900px] h-64 md:h-96 mb-16 drop-shadow-[0_0_50px_rgba(37,99,235,0.15)]"
          >
            <Image 
              src={logoSrc} 
              alt="VIGA Brand" 
              fill 
              className="object-contain"
              priority
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.4 }}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase mb-8 leading-[0.85]">
              The Autonomous <br/> <span className="text-blue-600">QA Protocol</span>
            </h1>
            
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs mb-14 leading-loose opacity-80">
              Agentes de inteligencia artificial que auditan <br className="hidden md:block" /> 
              su infraestructura en tiempo real con razonamiento humano.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Link href="/login" className="w-full md:w-auto bg-white text-black px-12 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.4em] hover:bg-blue-600 hover:text-white transition-all shadow-2xl active:scale-95">
                Deploy Agents
              </Link>
              <button className="w-full md:w-auto px-12 py-6 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-[0.4em] text-slate-400 hover:bg-white/5 transition-all">
                Documentation
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-40 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-black uppercase tracking-tighter mb-4 text-white">Capabilities</h2>
            <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full" />
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            <FeatureCard icon={<Cpu size={28}/>} title="IA Reasoning" desc="Nuestros agentes ven la UI como un humano y razonan sobre cada interacción." delay={0.1} />
            <FeatureCard icon={<Shield size={28}/>} title="Zero Maintenance" desc="Si cambia un botón, el agente lo encuentra automáticamente." delay={0.2} />
            <FeatureCard icon={<Globe size={28}/>} title="Global Grid" desc="Audite desde múltiples regiones con infraestructura distribuida." delay={0.3} />
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-40">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={springTransition}
            className="bg-[#080808] border border-white/5 rounded-[50px] p-16 text-center relative overflow-hidden shadow-3xl"
          >
            <h3 className="text-[11px] font-black uppercase tracking-[0.6em] text-blue-500 mb-8">Subscription</h3>
            <div className="flex items-end justify-center gap-2 mb-10">
              <span className="text-8xl font-black text-white tracking-tighter">$199</span>
              <span className="text-slate-500 font-bold uppercase text-sm mb-4">/ MO</span>
            </div>
            <ul className="space-y-5 mb-14 text-left max-w-xs mx-auto">
              <PricingItem text="Agentes Ilimitados" />
              <PricingItem text="Llama-3.3-70b Engine" />
              <PricingItem text="Priority Support" />
            </ul>
            <Link href="/login" className="block w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] hover:bg-blue-700 transition-all active:scale-[0.98]">
              Establish Connection
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function NavLink({ href, children }) {
  return (
    <Link href={href} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 transition-all hover:tracking-[0.2em]">
      {children}
    </Link>
  );
}

function FeatureCard({ icon, title, desc, delay }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay }}
      whileHover={{ y: -15, transition: { duration: 0.2 } }}
      className="p-12 bg-[#0A0A0A] border border-white/5 rounded-[32px] group transition-all hover:border-blue-600/40"
    >
      <div className="text-blue-600 mb-8 group-hover:scale-125 transition-transform duration-500">{icon}</div>
      <h3 className="text-base font-black uppercase tracking-widest text-white mb-5">{title}</h3>
      <p className="text-[12px] text-slate-500 font-bold uppercase leading-relaxed group-hover:text-slate-300 transition-colors">{desc}</p>
    </motion.div>
  );
}

function PricingItem({ text }) {
  return (
    <li className="flex items-center gap-4">
      <div className="bg-emerald-500/10 p-1 rounded-full">
        <Check size={16} className="text-emerald-500" />
      </div>
      <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">{text}</span>
    </li>
  );
}
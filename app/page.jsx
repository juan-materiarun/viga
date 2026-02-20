'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import { Zap, Shield, Sparkles, ArrowRight, Check, Play, Bot, Target, Map, Coins } from 'lucide-react';
import Button from './components/Button';

export default function LandingPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const logoScale = useTransform(scrollY, [0, 300], [1, 0.8]);
  // Logo Opacity (Extracted to fix Hook Error)
  const logoOpacity = useTransform(scrollY, [0, 200], [1, 0]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-[var(--bg-primary)]" />;

  // LOGO LOGIC: Forcing user choice
  const logoSrc = '/VIGA-lightlogo.png';

  return (
    <div className="relative w-full min-h-screen bg-[var(--bg-primary)] overflow-hidden selection:bg-[var(--accent-primary)] selection:text-white">

      {/* NAVBAR - Minimalista: Solo Login, Transparente, SIN LOGO */}
      <nav className="fixed top-0 w-full z-50 py-6 px-8 flex justify-end items-center bg-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <Link href="/login">
            <Button variant="primary" className="shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow">
              {t('auth.login')}
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-32 px-6 min-h-screen flex flex-col justify-center items-center overflow-hidden perspective-1000">

        {/* Dynamic Grid Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Logo Central - Aumentado a h-64 (Massive) */}
            <motion.div
              style={{ scale: logoScale, opacity: logoOpacity }}
              className="relative w-full max-w-[1000px] h-48 md:h-64 mx-auto mb-12"
            >
              <Image
                src={logoSrc}
                alt="VIGA Brand"
                fill
                className="object-contain drop-shadow-xl"
                priority
              />
            </motion.div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              <span className="text-xs font-bold text-purple-600 tracking-[0.2em]">
                VIGA V7.0 LIVE
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight text-[var(--text-primary)] mb-8 leading-[0.9]">
              AUTONOMOUS <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--text-primary)] via-purple-600 to-indigo-600 animate-gradient-x">
                QA AGENTS
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto font-light leading-relaxed">
              Deja que la Inteligencia Artificial explore, pruebe y proteja tu aplicación 24/7. Sin scripts frágiles. Sin mantenimiento.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/login">
                <Button variant="primary" size="lg" className="h-16 px-12 text-xl rounded-2xl shadow-xl shadow-purple-600/20 hover:shadow-purple-600/40 transition-all group bg-purple-600 hover:bg-purple-700 text-white border-none">
                  COMENZAR AHORA
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={24} />
                </Button>
              </Link>
              <Button variant="secondary" size="lg" className="h-16 px-10 text-xl rounded-2xl border-2 border-[var(--border-color)] bg-white/50 backdrop-blur-sm hover:bg-white/80">
                <Play size={20} className="mr-3 fill-current" />
                VER DEMO
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* THE TRINITY - AGENTS SHOWCASE */}
      <section className="py-32 px-6 relative bg-[var(--bg-secondary)]/30 border-y border-[var(--border-color)]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-6">
              LA TRINIDAD DE VIGA
            </h2>
            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
              Tres agentes especializados trabajando en orquestación perfecta.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            {/* AGENT 1: CHAOS */}
            <AgentCard
              title="CHAOS"
              subtitle="THE EXPLORER"
              icon={<Bot size={48} />}
              desc="Navegación autónoma heurística. Chaos explora tu aplicación sin mapa, encontrando bugs en flujos inesperados como un usuario real."
              gradient="from-purple-500 to-indigo-600"
              iconColor="text-purple-500"
              shadowColor="shadow-purple-500/40"
              features={['Exploración No Supervisada', 'Detección de Crash', 'Coverage Heatmap']}
            />

            {/* AGENT 2: STRIKE */}
            <AgentCard
              title="STRIKE"
              subtitle="THE SNIPER"
              icon={<Target size={48} />}
              desc="Precisión quirúrgica. Dale un objetivo en lenguaje natural y Strike ejecutará la misión una y otra vez para validar flujos críticos."
              gradient="from-red-500 to-orange-600"
              iconColor="text-red-500"
              shadowColor="shadow-red-500/40"
              features={['Objetivos en Lenguaje Natural', 'Validación de Negocio', 'Reporte Detallado']}
            />

            {/* AGENT 3: ATLAS */}
            <AgentCard
              title="ATLAS"
              subtitle="THE ARCHITECT"
              icon={<Map size={48} />}
              desc="Mapeo y generación de tests. Atlas recorre tu sitio para construir el grafo de conocimiento y generar suites de pruebas completas."
              gradient="from-blue-500 to-cyan-600"
              iconColor="text-blue-500"
              shadowColor="shadow-blue-500/40"
              features={['Knowledge Graph', 'Auto-Generación de Tests', 'Mantenimiento de Selectores']}
            />
          </div>
        </div>
      </section>

      {/* FOUNDER VALUE SECTION (New) */}
      <section className="py-32 px-6 relative overflow-hidden">
        {/* Purple Blobs for Dynamism */}
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full -z-10 mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[100px] rounded-full -z-10 mix-blend-screen" />

        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-8 leading-tight">
                ROI Inmediato para <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                  Equipos de Alto Rendimiento
                </span>
              </h2>
              <div className="space-y-8">
                <ValueProp
                  icon={<Zap className="text-yellow-400" size={24} />}
                  title="Ship 10x Faster"
                  desc="Elimina el cuello de botella de QA manual. Tus desarrolladores hacen push, VIGA valida en minutos, no días."
                />
                <ValueProp
                  icon={<Shield className="text-green-400" size={24} />}
                  title="Day-Zero Security"
                  desc="Cumple con SOC2 e ISO desde el día 1. Trazabilidad completa y logs de auditoría para cada test ejecutado."
                />
                <ValueProp
                  icon={<Coins className="text-purple-400" size={24} />}
                  title="Cut Costs by 80%"
                  desc="Olvídate de mantener granjas de dispositivos o equipos masivos de QA manual. VIGA escala infinitamente por una fracción del costo."
                />
              </div>
            </div>

            {/* Visual Metric Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 blur-2xl opacity-20 transform rotate-6 rounded-3xl" />
              <div className="relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[var(--text-secondary)] text-sm font-semibold uppercase tracking-wider">Ahorro Mensual Proyectado</p>
                    <h3 className="text-4xl font-bold text-[var(--text-primary)]">$12,450</h3>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <ArrowRight className="text-green-500 -rotate-45" size={24} />
                  </div>
                </div>
                {/* Dummy Chart */}
                <div className="h-48 flex items-end gap-2 justify-between">
                  {[40, 65, 45, 80, 55, 90, 100].map((h, i) => (
                    <div key={i} className="w-full bg-[var(--accent-primary)]/20 rounded-t-lg relative group overflow-hidden" style={{ height: `${h}%` }}>
                      <div className="absolute bottom-0 left-0 w-full bg-[var(--accent-primary)] transition-all duration-1000" style={{ height: '0%', animation: `fillHeight 1s ease-out ${i * 0.1}s forwards` }} />
                      <style jsx>{`@keyframes fillHeight { to { height: 100%; } }`}</style>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between text-xs text-[var(--text-muted)] font-mono">
                  <span>ENE</span><span>FEB</span><span>MAR</span><span>ABR</span><span>MAY</span><span>JUN</span><span>JUL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TECH STACK / FEATURES */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] leading-tight">
              Self-Healing <br />
              Selection Engine
            </h2>
            <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
              VIGA no usa XPaths frágiles. Nuestro motor de visión entiende tu UI visualmente y semánticamente. Si cambias un ID o una clase, VIGA se adapta automáticamente.
            </p>
            <div className="space-y-4">
              <FeatureItem text="Visión Computacional Avanzada" />
              <FeatureItem text="Análisis Semántico del DOM" />
              <FeatureItem text="Reintento Inteligente" />
            </div>
          </div>
          <div className="flex-1 relative h-[500px] w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl p-8 flex items-center justify-center group">
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="relative z-10 text-center space-y-4">
              <div className="w-24 h-24 mx-auto bg-[var(--accent-primary)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/40 transition-colors duration-500">
                <Zap size={40} className="text-white" />
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                &lt;button&gt;Submit&lt;/button&gt;
              </div>
              <div className="text-sm font-mono text-[var(--accent-primary)] animate-pulse">
                Found match (99.8%)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="relative w-24 h-8 opacity-80">
            <Image
              src={logoSrc}
              alt="VIGA Logo"
              fill
              className="object-contain object-left"
            />
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            © 2026 VIGA AI Inc. Construyendo el futuro del QA.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Twitter</a>
            <a href="#" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">GitHub</a>
            <a href="#" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AgentCard({ title, subtitle, icon, desc, gradient, iconColor, shadowColor, features }) {
  return (
    <motion.div
      className="group relative h-full bg-[var(--card-bg)] border border-[var(--border-color)] p-8 rounded-3xl overflow-hidden shadow-xl transition-colors hover:border-[var(--accent-primary)]/50"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 blur-3xl -z-10 group-hover:opacity-20 transition-opacity`} />

      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-8 shadow-lg group-hover:${shadowColor}`}>
        {icon}
      </div>

      <div className="mb-6">
        <h3 className="text-3xl font-bold text-[var(--text-primary)] mb-1">{title}</h3>
        <p className={`text-sm font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent uppercase tracking-wider`}>
          {subtitle}
        </p>
      </div>

      <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
        {desc}
      </p>

      <ul className="space-y-3 mt-auto">
        {features.map((feat, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-[var(--text-primary)] font-medium">
            <Check size={16} className={iconColor} />
            {feat}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function ValueProp({ icon, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{title}</h3>
        <p className="text-[var(--text-secondary)] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FeatureItem({ text }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
      <div className="bg-green-500/10 p-2 rounded-full">
        <Check size={16} className="text-green-500" />
      </div>
      <span className="font-semibold text-[var(--text-primary)]">{text}</span>
    </div>
  );
}
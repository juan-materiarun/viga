'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Globe, Lock, Unlock, Target, Compass, LayoutTemplate, Cpu, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import AgentCard from '../components/AgentCard'; // NEW
import AgentFloatingBubble from '../components/AgentFloatingBubble';
import InfoTooltip from '../components/InfoTooltip';

export default function DashboardPage() {
  const [url, setUrl] = useState('');
  const [goal, setGoal] = useState('');
  const [agentType, setAgentType] = useState('chaos'); // chaos, strike, atlas
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [activeSuiteId, setActiveSuiteId] = useState(null);
  const [sourceSuiteId, setSourceSuiteId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [urlsDesbloqueadas, setUrlsDesbloqueadas] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [recentSuites, setRecentSuites] = useState([]);

  const router = useRouter();

  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (user) refreshProfile();
  }, [user, status]);

  // Cargar URLs desbloqueadas cuando se selecciona Atlas
  useEffect(() => {
    if (agentType === 'atlas' && user) {
      cargarUrlsDesbloqueadas();
    }
  }, [agentType, user]);

  useEffect(() => {
    if (user) fetchRecentSuites();
  }, [user]);

  const fetchRecentSuites = async () => {
    const { data } = await supabase
      .from('test_suites')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentSuites(data || []);
  };

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-suites')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'test_suites'
      }, () => {
        fetchRecentSuites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cargarUrlsDesbloqueadas = async () => {
    const { data } = await supabase
      .from('test_suites')
      .select('id, name, base_url, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (data) {
      // Agrupar por base_url para evitar duplicados
      const urlsUnicas = data.reduce((acc, suite) => {
        if (!acc.find(s => s.base_url === suite.base_url)) {
          acc.push(suite);
        }
        return acc;
      }, []);
      setUrlsDesbloqueadas(urlsUnicas.slice(0, 10));
    }
  };

  const handleDeploy = async () => {
    if (!url) return;

    const { data: suite } = await supabase.from('test_suites').insert([{
      name: `${agentType.toUpperCase()}: ${url}`,
      base_url: url,
      mode: agentType, // FIX: Set mode explicitly
      status: 'running',
      user_id: user?.id // Required for RLS
    }]).select().single();

    if (suite) {
      setActiveSuiteId(suite.id);
      setStatus('running');

      await fetch(`/api/run-${agentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          suite_id: suite.id,
          goal: goal || null,
          credentials: showCredentials ? credentials : null,
          userId: user?.id,
          source_suite_id: agentType === 'atlas' ? sourceSuiteId : null
        })
      });
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3">
            {t('dashboard.title')}
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">
            DESPLIEGA AGENTES AUTÓNOMOS PARA EXPLORAR TU APLICACIÓN
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <div className="text-[var(--accent-primary)] mb-3 inline-block">
              <Zap size={32} />
            </div>
            <h3 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              {profile?.vigas_balance || 0}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">VIGAS DISPONIBLES</p>
          </Card>

          <Card className="text-center">
            <div className="text-[var(--accent-primary)] mb-3 inline-block">
              <Globe size={32} />
            </div>
            <h3 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              {status === 'running' ? '1' : '0'}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">AGENTES ACTIVOS</p>
          </Card>

          <Card className="text-center">
            <div className="text-[var(--accent-primary)] mb-3 inline-block">
              {status === 'running' ? <Unlock size={32} /> : <Lock size={32} />}
            </div>
            <h3 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              {status === 'running' ? 'ACTIVO' : 'INACTIVO'}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">ESTADO DEL SISTEMA</p>
          </Card>
        </div>

        {/* Deploy Form */}
        <Card className="p-8 border-2 border-[var(--accent-primary)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            {t('dashboard.deploy')}
          </h2>

          <div className="space-y-6">
            {/* Agent Selector */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-4">
                SELECCIONAR AGENTE
                <InfoTooltip text="Elige el tipo de agente según tu objetivo: CHAOS para exploración completa, STRIKE para objetivos específicos, o ATLAS para generar casos de prueba." />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AgentCard
                  id="chaos"
                  title="CHAOS"
                  description="Exploración autónoma completa y descubrimiento de vulnerabilidades."
                  icon={Zap}
                  selected={agentType === 'chaos'}
                  onClick={() => setAgentType('chaos')}
                  color="#F59E0B"
                  disabled={status === 'running'}
                />

                <AgentCard
                  id="strike"
                  title="STRIKE"
                  description="Ejecución dirigida a un objetivo específico que tú defines."
                  icon={Target}
                  selected={agentType === 'strike'}
                  onClick={() => setAgentType('strike')}
                  color="#EF4444"
                  disabled={status === 'running'}
                />

                <AgentCard
                  id="atlas"
                  title="ATLAS"
                  description="Generador de casos de prueba estructurados y repetibles."
                  icon={Compass}
                  selected={agentType === 'atlas'}
                  onClick={() => setAgentType('atlas')}
                  color="#3B82F6"
                  disabled={status === 'running'}
                />
              </div>
            </div>

            {/* URL Input o Selector (según agente) */}
            {agentType === 'atlas' ? (
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  SELECCIONAR URL DESBLOQUEADA
                </label>
                {urlsDesbloqueadas.length === 0 ? (
                  <div className="p-6 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-color)] text-center">
                    <p className="text-sm text-[var(--text-muted)] mb-2">
                      NO HAY URLs DESBLOQUEADAS
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Primero ejecuta CHAOS en una URL para desbloquearla
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {urlsDesbloqueadas.map((suite) => (
                      <button
                        key={suite.id}
                        onClick={() => {
                          setSelectedUrl(suite.base_url);
                          setUrl(suite.base_url);
                          setSourceSuiteId(suite.id);
                        }}
                        disabled={status === 'running'}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedUrl === suite.base_url
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                          : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]/50'
                          } ${status === 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
                              {suite.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] no-uppercase">
                              {suite.base_url}
                            </p>
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {new Date(suite.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  URL DE LA APLICACIÓN
                </label>
                <input
                  type="url"
                  className="input no-uppercase"
                  placeholder={t('dashboard.url.placeholder')}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={status === 'running'}
                />
              </div>
            )}

            {/* Goal Input (for Strike) */}
            {agentType === 'strike' && (
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  OBJETIVO (REQUERIDO PARA STRIKE)
                  <InfoTooltip text="Define qué acción específica quieres que el agente STRIKE ejecute, por ejemplo: 'Completar formulario de registro' o 'Realizar una compra'." />
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Completar formulario de registro"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  disabled={status === 'running'}
                />
              </div>
            )}

            {/* Credentials Toggle */}
            <div>
              <button
                onClick={() => setShowCredentials(!showCredentials)}
                className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)] smooth-transition"
              >
                {showCredentials ? <Unlock size={16} /> : <Lock size={16} />}
                {t('dashboard.credentials')}
              </button>

              {showCredentials && (
                <div className="mt-4 space-y-4 p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-color)]">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
                      {t('dashboard.email')}
                    </label>
                    <input
                      type="email"
                      className="input no-uppercase"
                      placeholder="test@example.com"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      disabled={status === 'running'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
                      {t('dashboard.password')}
                    </label>
                    <input
                      type="password"
                      className="input no-uppercase"
                      placeholder="••••••••"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      disabled={status === 'running'}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Deploy Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleDeploy}
              disabled={!url || (agentType === 'strike' && !goal) || status === 'running'}
              className="w-full"
              title="Iniciar la ejecución del agente seleccionado con los parámetros configurados"
            >
              <Zap size={20} />
              {status === 'running' ? 'AGENTE EN EJECUCIÓN...' : `DESPLEGAR ${agentType.toUpperCase()}`}
            </Button>
          </div>
        </Card>

        {/* Recent Tests */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            PRUEBAS RECIENTES
          </h2>
          <div className="grid gap-4">
            {recentSuites.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-[var(--text-muted)]">NO HAY PRUEBAS RECIENTES</p>
              </Card>
            ) : (
              recentSuites.map(suite => (
                <div
                  key={suite.id}
                  onClick={() => router.push(`/execution?suite_id=${suite.id}`)}
                  className="bg-[var(--card-bg)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] p-6 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] mb-1">
                      {suite.name}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] font-mono">
                      {suite.base_url}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${suite.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                      suite.status === 'running' ? 'bg-blue-500/10 text-blue-500 animate-pulse' : 'bg-gray-500/10 text-gray-500'
                      }`}>
                      {suite.status}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(suite.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-center">
          <p className="text-sm text-[var(--text-muted)]">
            © 2026 VIGA by <span className="font-bold text-[var(--accent-primary)]">MATERIA</span>. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Agent Floating Bubble */}
      {activeSuiteId && status === 'running' && (
        <AgentFloatingBubble suiteId={activeSuiteId} />
      )}
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Clock, Eye, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '../contexts/LanguageContext';
import Button from '../components/Button';
import Card from '../components/Card';
import InfoTooltip from '../components/InfoTooltip';
import Loader from '../components/Loader';
import AgentFloatingBubble from '../components/AgentFloatingBubble';

export default function TestsPage() {
  const router = useRouter();
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSuiteId, setActiveSuiteId] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    fetchSuites();

    // Real-time subscription
    const channel = supabase
      .channel('tests-page-suites')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'test_suites'
      }, () => {
        fetchSuites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSuites = async () => {
    const { data } = await supabase
      .from('test_suites')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setSuites(data);
      // Find if there is any RECENT running suite to show bubble (last 10 minutes)
      const running = data.find(s => {
        if (s.status !== 'running') return false;
        const ageMs = Date.now() - new Date(s.created_at).getTime();
        return ageMs < 10 * 60 * 1000; // Only show for tests started in last 10 minutes
      });
      if (running) setActiveSuiteId(running.id);
      else setActiveSuiteId(null);
    }
    setLoading(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={20} className="text-green-500" />;
      case 'failed':
        return <XCircle size={20} className="text-red-500" />;
      default:
        return <Clock size={20} className="text-[var(--accent-primary)]" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'COMPLETADO';
      case 'failed':
        return 'FALLIDO';
      case 'running':
        return 'EN EJECUCIÓN';
      default:
        return 'PENDIENTE';
    }
  };

  return (
    <div className="p-8 animate-fade-in relative min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3 flex items-center gap-3">
            {t('tests.title')}
            <InfoTooltip text="Historial completo de todas las pruebas ejecutadas por los agentes CHAOS, STRIKE y ATLAS. Puedes ver los detalles de cada ejecución o eliminar pruebas antiguas." size={20} />
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">
            HISTORIAL DE PRUEBAS EJECUTADAS
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="text-center">
            <h3 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              {suites.length}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">TOTAL</p>
          </Card>
          <Card className="text-center">
            <h3 className="text-3xl font-bold text-green-500 mb-2">
              {suites.filter(s => s.status === 'completed').length}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">{t('tests.completed')}</p>
          </Card>
          <Card className="text-center">
            <h3 className="text-3xl font-bold text-[var(--accent-primary)] mb-2">
              {suites.filter(s => s.status === 'running').length}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">{t('tests.running')}</p>
          </Card>
          <Card className="text-center">
            <h3 className="text-3xl font-bold text-red-500 mb-2">
              {suites.filter(s => s.status === 'failed').length}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">{t('tests.failed')}</p>
          </Card>
        </div>

        {/* Tests List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            PRUEBAS RECIENTES
          </h2>

          {loading ? (
            <>
              {/* Skeleton Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl p-6 text-center">
                      <div className="h-8 bg-[var(--border-color)] rounded w-16 mx-auto mb-2"></div>
                      <div className="h-4 bg-[var(--border-color)] rounded w-24 mx-auto"></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Skeleton Test Cards */}
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-5 h-5 bg-[var(--border-color)] rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-5 bg-[var(--border-color)] rounded w-48 mb-2"></div>
                            <div className="h-4 bg-[var(--border-color)] rounded w-64"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : suites.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-[var(--text-muted)]">NO HAY PRUEBAS REGISTRADAS</p>
            </Card>
          ) : (
            suites.map((suite) => (
              <Card key={suite.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {getStatusIcon(suite.status)}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                        {suite.name}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)] no-uppercase">
                        {suite.base_url}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {new Date(suite.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="px-4 py-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-color)]">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {getStatusText(suite.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/execution?suite_id=${suite.id}`)}
                    >
                      <Eye size={16} />
                      VER
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm('¿Eliminar esta prueba?')) {
                          await supabase.from('test_suites').delete().eq('id', suite.id);
                          // fetchSuites handled by subscription
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-center">
          <p className="text-sm text-[var(--text-muted)]">
            © 2026 VIGA by <span className="font-bold text-[var(--accent-primary)]">MATERIA</span>. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Floating Bubble Persistence */}
      {activeSuiteId && <AgentFloatingBubble suiteId={activeSuiteId} />}
    </div>
  );
}
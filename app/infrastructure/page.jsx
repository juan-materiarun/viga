'use client';

import { useState, useEffect } from 'react';
import { Server, RefreshCw, Zap, Activity } from 'lucide-react';
import { useInfraStatus } from '@/lib/hooks/use-viga-data';
import Card from '../components/Card';
import Button from '../components/Button';

export default function InfrastructurePage() {
  const { data: services = [], isValidating, mutate } = useInfraStatus();
  const isReloading = isValidating;

  const fetchInfraStatus = () => {
    mutate();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-[var(--text-muted)]';
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              INFRASTRUCTURE
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              MONITOREO ACTIVO DE SERVICIOS
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={fetchInfraStatus}
            disabled={isReloading}
            title="Actualizar estado de todos los servicios en tiempo real"
          >
            <RefreshCw size={16} className={isReloading ? 'animate-spin' : ''} />
            {isReloading ? 'ACTUALIZANDO...' : 'ACTUALIZAR'}
          </Button>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {services.length > 0 ? (
            services.map((service) => (
              <Card key={service.name} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center gap-2 ${getStatusColor(service.status)}`}>
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    <span className="text-xs font-bold">{service.status.toUpperCase()}</span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{service.type}</span>
                </div>

                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                  {service.name}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">{service.spec}</p>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--text-muted)]">LATENCIA</span>
                      <span className="text-[var(--text-primary)] font-bold">{service.load}</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-[var(--bg-hover)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-primary)] transition-all duration-1000"
                        style={{ width: `${service.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
                    <span className="text-xs text-[var(--text-muted)]">UPTIME</span>
                    <span className="text-xs font-bold text-green-500">{service.uptime}</span>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            // Fallback skeletons while client-side fetching is happening but page is mounted
            [1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6 bg-[var(--bg-secondary)]/50 animate-pulse">
                <div className="h-4 w-20 bg-[var(--bg-hover)] rounded mb-4"></div>
                <div className="h-6 w-32 bg-[var(--bg-hover)] rounded mb-2"></div>
                <div className="h-4 w-24 bg-[var(--bg-hover)] rounded mb-4"></div>
                <div className="h-2 w-full bg-[var(--bg-hover)] rounded"></div>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <Card className="p-6 bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-[var(--accent-primary)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                TODOS LOS SISTEMAS OPERATIVOS
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              ÚLTIMA ACTUALIZACIÓN: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </Card>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-center">
          <p className="text-sm text-[var(--text-muted)]">
            © 2026 VIGA by <span className="font-bold text-[var(--accent-primary)]">MATERIA</span>. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
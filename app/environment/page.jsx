'use client';

import { Database } from 'lucide-react';
import Card from '../components/Card';

export default function EnvironmentPage() {
    return (
        <div className="p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-3">
                        <Database className="text-[var(--accent-primary)]" size={28} />
                        ENTORNO
                    </h1>
                    <p className="text-sm text-[var(--text-muted)]">
                        ADMINISTRACIÓN DE VARIABLES Y SECRETOS
                    </p>
                </div>

                <Card className="p-12 flex flex-col items-center justify-center text-center opacity-70">
                    <Database size={64} className="text-[var(--text-muted)] mb-4" />
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">En Construcción</h2>
                    <p className="text-[var(--text-muted)] mt-2">
                        Esta sección está siendo preparada para gestionar tus variables de entorno centralizadas.
                    </p>
                </Card>
            </div>
        </div>
    );
}

'use client';

import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import Button from './components/Button';

export default function NotFound() {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] animate-fade-in">
            <div className="text-center space-y-6 max-w-md px-6">
                <div className="flex justify-center mb-6">
                    <div className="p-6 bg-[var(--bg-secondary)] rounded-full border border-[var(--border-color)] shadow-sm">
                        <FileQuestion size={64} className="text-[var(--text-secondary)] opacity-50" />
                    </div>
                </div>

                <h1 className="text-4xl font-bold tracking-tight">404</h1>
                <h2 className="text-xl font-semibold text-[var(--text-secondary)]">Página no encontrada</h2>

                <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    Lo sentimos, la página que estás buscando no existe o ha sido movida.
                </p>

                <div className="pt-4">
                    <Link href="/dashboard">
                        <Button className="w-full justify-center">
                            Volver al Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

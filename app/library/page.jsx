'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FlaskConical, Search, Clock, Code, Download, Copy, ExternalLink,
    FileText, Trash2, Shield, Calendar, Terminal, Filter, RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Loader from '../components/Loader';
import InfoTooltip from '../components/InfoTooltip';

export default function LibraryPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [scripts, setScripts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTab, setSelectedTab] = useState('all'); // all, chaos, strike
    const [refreshing, setRefreshing] = useState(false);

    const fetchScripts = async () => {
        try {
            setRefreshing(true);
            const { data, error } = await supabase
                .from('test_suites')
                .select('*')
                .not('generated_code', 'is', null) // Only fetch suites with code
                .order('created_at', { ascending: false });

            if (error) throw error;
            setScripts(data || []);
        } catch (error) {
            console.error('Error fetching scripts:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchScripts();
    }, []);

    const filteredScripts = scripts.filter(script => {
        const matchesSearch =
            script.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            script.test_goal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            script.id.includes(searchTerm);

        const matchesTab = selectedTab === 'all' || script.mode === selectedTab;

        return matchesSearch && matchesTab;
    });

    const downloadScript = (script) => {
        const blob = new Blob([script.generated_code], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `viga-test-${script.id.slice(0, 8)}.spec.js`;
        a.click();
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Toast logic here if implemented
    };

    return (
        <div className="p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3 flex items-center gap-3">
                            <FlaskConical className="text-[var(--accent-primary)]" size={40} />
                            Biblioteca de Tests
                        </h1>
                        <p className="text-[var(--text-secondary)] text-lg ml-14">
                            REPOSITORIO DE SCRIPTS DE AUTOMATIZACIÓN
                        </p>
                    </div>
                    <Button
                        onClick={fetchScripts}
                        variant="secondary"
                        isLoading={refreshing}
                        className="h-12 px-6"
                    >
                        <RefreshCw size={20} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Actualizar
                    </Button>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por URL, objetivo o ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] text-base"
                        />
                    </div>

                    <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-xl border border-[var(--border-color)] shrink-0">
                        {['all', 'chaos', 'strike'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setSelectedTab(tab)}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all uppercase ${selectedTab === tab
                                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                {tab === 'all' ? 'Todos' : tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Grid */}
                <div className="">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader size="lg" />
                        </div>
                    ) : filteredScripts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)]/30">
                            <Code size={48} className="text-[var(--text-muted)] mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold text-[var(--text-secondary)]">No hay scripts generados</h3>
                            <p className="text-[var(--text-muted)] text-sm mt-1">
                                Ejecuta una misión con Chaos o Strike para generar código automáticamente.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredScripts.map(script => (
                                <div key={script.id} className="group relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors flex flex-col h-full">
                                    {/* Badge Overlay */}
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider border ${script.mode === 'chaos'
                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                            {script.mode || 'CHAOS'}
                                        </span>
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            {/* Status Dot */}
                                            <div className={`w-2 h-2 rounded-full ${script.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'
                                                }`} />
                                            <span className="text-xs font-mono text-[var(--text-muted)]">
                                                {new Date(script.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3
                                            className="text-base font-bold text-[var(--text-primary)] line-clamp-2 leading-tight mb-1 group-hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
                                            onClick={() => router.push(`/execution?suite_id=${script.id}`)}
                                            title={script.test_goal}
                                        >
                                            {script.test_goal || 'Exploración Sin Título'}
                                        </h3>
                                        <a
                                            href={script.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] flex items-center gap-1.5 mt-1 transition-colors w-fit"
                                        >
                                            <ExternalLink size={10} />
                                            {(() => {
                                                try {
                                                    return new URL(script.url).hostname;
                                                } catch (e) {
                                                    return script.url || 'No URL';
                                                }
                                            })()}
                                        </a>
                                    </div>

                                    {/* Code Preview Snippet */}
                                    <div className="flex-1 bg-[var(--bg-base)] rounded-lg p-3 mb-4 font-mono text-[10px] text-[var(--text-muted)] overflow-hidden border border-[var(--border-color)] opacity-70 group-hover:opacity-100 transition-opacity relative">
                                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--bg-base)] to-transparent pointer-events-none" />
                                        <p className="line-clamp-4 leading-relaxed">
                                            {script.generated_code?.slice(0, 150)}...
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-[var(--border-color)]">
                                        <button
                                            onClick={() => downloadScript(script)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)] hover:text-white transition-all text-xs font-bold"
                                        >
                                            <Download size={14} />
                                            Descargar
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(script.generated_code)}
                                            className="p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                                            title="Copiar Código"
                                        >
                                            <Copy size={16} />
                                        </button>
                                        <button
                                            onClick={() => router.push(`/execution?suite_id=${script.id}`)}
                                            className="p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                                            title="Ver Ejecución"
                                        >
                                            <Terminal size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

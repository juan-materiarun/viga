'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
    Send, Save, Plus, Folder
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Loader from '../components/Loader';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

export default function ApiLabPage() {
    // State
    const [collections, setCollections] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Request State
    const [method, setMethod] = useState('GET');
    const [url, setUrl] = useState('');
    const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
    const [body, setBody] = useState('');

    // Response State
    const [response, setResponse] = useState(null);
    const [responseLoading, setResponseLoading] = useState(false);

    // Initial Load
    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        setIsLoading(true);
        const { data: cols, error } = await supabase
            .from('api_collections')
            .select('*, api_requests(*)')
            .order('created_at', { ascending: false });

        if (cols) setCollections(cols);
        setIsLoading(false);
    };

    const handleSend = async () => {
        if (!url) return;
        setResponseLoading(true);
        setResponse(null);

        try {
            let parsedHeaders = {};
            try {
                parsedHeaders = JSON.parse(headers);
            } catch (e) {
                alert('Headers inválidos (JSON incorrecto)');
                setResponseLoading(false);
                return;
            }

            const res = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method,
                    url,
                    headers: parsedHeaders,
                    body: method !== 'GET' ? body : undefined
                })
            });

            const data = await res.json();
            setResponse(data);
        } catch (err) {
            setResponse({ error: err.message });
        } finally {
            setResponseLoading(false);
        }
    };

    const handleSave = async () => {
        if (!url) return alert('Ingresa una URL primero');

        // Prevent re-entry
        if (isSaving) return;

        const name = prompt('Nombre de la petición:', selectedRequest?.name || 'Nueva Petición');
        if (!name) return;

        setIsSaving(true);
        try {
            // Needs a collection - simple UX: default to first or create new
            let colId = collections[0]?.id;
            if (!colId) {
                const newColName = prompt('Nombre de la Colección:', 'Mi API');
                if (!newColName) throw new Error('Nombre de colección requerido');

                const { data: newCol } = await supabase.from('api_collections').insert({
                    name: newColName,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                }).select().single();

                if (newCol) {
                    setCollections(prev => [newCol, ...prev]);
                    colId = newCol.id;
                } else throw new Error('Error al crear colección');
            }

            const payload = {
                collection_id: colId,
                name,
                method,
                url,
                headers: JSON.parse(headers), // Ensure valid json
                body
            };

            if (selectedRequest?.id) {
                await supabase.from('api_requests').update(payload).eq('id', selectedRequest.id);
            } else {
                await supabase.from('api_requests').insert(payload);
            }

            await fetchCollections();
            // TODO: Replace alert with Toast in future
            alert('¡Petición guardada exitosamente!');
        } catch (error) {
            console.error(error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const loadRequest = (req) => {
        setSelectedRequest(req);
        setMethod(req.method);
        setUrl(req.url);
        setHeaders(JSON.stringify(req.headers || {}, null, 2));
        setBody(req.body || '');
        setResponse(null);
    };

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans">

            {/* Header - Standardized */}
            <div className="px-8 pt-8 pb-4 shrink-0 dashboard-header">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-3">
                            <Send className="text-[var(--accent-primary)]" size={40} />
                            API Lab
                        </h1>
                        <p className="text-[var(--text-secondary)] text-lg ml-14">
                            ENTORNO DE PRUEBAS Y DEBUGGING DE API
                        </p>
                    </div>
                </div>
            </div>

            <main className="flex-1 flex overflow-hidden border-t border-[var(--border-color)]">

                {/* SIDEBAR: COLLECTIONS */}
                <div className="w-64 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col">
                    <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Colecciones</span>
                        <button onClick={() => fetchCollections()} className="hover:bg-[var(--bg-hover)] p-1 rounded">
                            <Plus size={14} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {isLoading && <div className="p-4"><Loader size="sm" /></div>}

                        {collections.map(col => (
                            <div key={col.id} className="mb-2">
                                <div className="flex items-center gap-2 px-2 py-1 text-sm font-bold text-[var(--text-primary)] mb-1">
                                    <Folder size={14} className="text-yellow-500" />
                                    {col.name}
                                </div>
                                <div className="pl-4 space-y-1">
                                    {col.api_requests?.map(req => (
                                        <button
                                            key={req.id}
                                            onClick={() => loadRequest(req)}
                                            className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors ${selectedRequest?.id === req.id ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                        >
                                            <span className={`font-mono font-bold w-8 ${req.method === 'GET' ? 'text-blue-400' : req.method === 'POST' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {req.method}
                                            </span>
                                            <span className="truncate">{req.name}</span>
                                        </button>
                                    ))}
                                    {(!col.api_requests || col.api_requests.length === 0) && (
                                        <div className="text-[10px] text-[var(--text-muted)] italic px-2">Vacío</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MAIN: BUILDER & RESPONSE */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* TOP BAR: URL & SEND */}
                    <div className="h-16 border-b border-[var(--border-color)] flex items-center gap-2 px-4 bg-[var(--bg-base)]">
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[var(--accent-primary)]"
                        >
                            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>

                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://api.example.com/v1/endpoint"
                            className="flex-1 bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 outline-none focus:border-[var(--accent-primary)] font-mono"
                        />

                        <Button onClick={handleSend} disabled={responseLoading} className="min-w-[100px] flex items-center justify-center gap-2">
                            {responseLoading ? (
                                <>
                                    <Loader size="sm" className="animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={14} />
                                    <span>Send</span>
                                </>
                            )}
                        </Button>

                        <Button variant="secondary" onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2">
                            {isSaving ? <Loader size="sm" className="animate-spin" /> : <Save size={14} />}
                            <span>Save</span>
                        </Button>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* LEFT: PARAMS/BODY */}
                        <div className="flex-1 flex flex-col border-r border-[var(--border-color)]">
                            <div className="flex border-b border-[var(--border-color)]">
                                <div className="px-4 py-2 text-xs font-bold border-b-2 border-[var(--accent-primary)] text-[var(--text-primary)]">Body</div>
                                <div className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">Headers</div>
                            </div>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="{ 'key': 'value' }"
                                className="flex-1 bg-[var(--bg-base)] p-4 text-xs font-mono text-[var(--text-primary)] outline-none resize-none"
                            />
                        </div>

                        {/* RIGHT: RESPONSE */}
                        <div className="flex-1 flex flex-col bg-[var(--bg-secondary)]/50">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] h-[37px]">
                                <span className="text-xs font-bold text-[var(--text-secondary)]">Response</span>
                                {response && (
                                    <div className="flex items-center gap-3 text-[10px]">
                                        <span className={`px-1.5 py-0.5 rounded ${String(response.status).startsWith('2') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {response.status} {response.statusText}
                                        </span>
                                        <span className="text-[var(--text-muted)]">{response.duration}ms</span>
                                        <span className="text-[var(--text-muted)]">{response.size}B</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-auto p-4 relative">
                                {responseLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-base)]/50 backdrop-blur-sm">
                                        <Loader />
                                    </div>
                                )}

                                {response ? (
                                    <pre className="text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap break-all">
                                        {JSON.stringify(response.data, null, 2)}
                                    </pre>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
                                        <Send size={32} className="mb-2" />
                                        <span className="text-xs">Send a request to see the response</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

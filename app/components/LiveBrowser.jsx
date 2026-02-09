'use client';
import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, ExternalLink, Monitor, Wifi, Activity, Loader2, RefreshCw } from 'lucide-react';
import Screencast from './Screencast';

export default function LiveBrowser({ isRunning = false }) {
    const [scale, setScale] = useState(1);
    const [wsUrl, setWsUrl] = useState(null);
    const [status, setStatus] = useState('offline'); // offline | connecting | active | error
    const [forceHost, setForceHost] = useState('127.0.0.1'); // Allow user to toggle IP

    // Toggle Host Loop: 127.0.0.1 -> localhost
    const toggleHost = () => {
        setForceHost(prev => prev === '127.0.0.1' ? 'localhost' : '127.0.0.1');
    };

    // Poll for active Browserless sessions
    useEffect(() => {
        if (!isRunning) {
            setStatus('offline');
            setWsUrl(null);
            return;
        }

        setStatus('connecting');
        setWsUrl(null);

        let intervalId;

        const checkSession = async () => {
            try {
                // Fetch sessions from our Next.js API (which proxies to Browserless)
                const res = await fetch('/api/live');
                const data = await res.json();

                if (data.success && data.sessions && data.sessions.length > 0) {
                    // Filter for type 'page' to avoid connecting to background workers or service workers
                    const pageSessions = data.sessions.filter(s => s.type === 'page');
                    const session = pageSessions.length > 0 ? pageSessions[0] : data.sessions[0];
                    let sessionId = session.id;

                    // Fallback: Browserless V2 might put the path in targetId
                    if (!sessionId && session.targetId) {
                        sessionId = session.targetId;
                        // Clean up if it is a path like /devtools/page/ID
                        if (sessionId.includes('/devtools/page/')) {
                            sessionId = sessionId.split('/devtools/page/')[1];
                        }
                    }

                    // Fallback: Extract from WS URL
                    if (!sessionId && session.webSocketDebuggerUrl) {
                        const match = session.webSocketDebuggerUrl.match(/\/page\/(.+)$/);
                        if (match) sessionId = match[1];
                    }

                    if (sessionId && sessionId !== 'undefined') {
                        // Use the NATIVE Host (forceHost:9222)
                        const host = `${forceHost}:9222`;

                        // STANDARD CDP URL (Browserless 1.x)
                        // The proxy will forward this to 3001
                        let cleanSessionId = sessionId;
                        if (cleanSessionId.includes('/devtools/page/')) {
                            cleanSessionId = cleanSessionId.split('/devtools/page/')[1];
                        }

                        // NOTE: For Screencast component, we just need the WS URL.
                        const wsTarget = `ws://${host}/devtools/page/${cleanSessionId}`;

                        setWsUrl(prev => {
                            if (prev === wsTarget) return prev;
                            return wsTarget;
                        });
                        setStatus('active');
                    } else {
                        if (status !== 'error') {
                            console.warn('LiveView: Session found but ID invalid', session);
                            setWsUrl(null);
                        }
                    }
                } else {
                    if (data.sessions && data.sessions.length === 0) {
                        setWsUrl(null);
                        setStatus('waiting');
                    }
                }
            } catch (err) {
                console.error('LiveView Poll Error:', err);
                setStatus('error');
            }
        };

        // Check immediately then poll
        checkSession();
        intervalId = setInterval(checkSession, 1000);

        return () => clearInterval(intervalId);
    }, [isRunning, forceHost]); // Re-run if host toggle changes

    if (!isRunning) return null;

    return (
        <div className="w-full h-full flex flex-col bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-2xl relative group">

            {/* Elegant Floating Header */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 py-2 px-6 rounded-full bg-[var(--bg-base)]/80 border border-[var(--border-color)] backdrop-blur-xl shadow-xl transition-all hover:bg-[var(--bg-base)] opacity-0 group-hover:opacity-100 duration-500">

                {/* Status Indicator */}
                <div className="flex items-center gap-3 border-r border-[var(--border-color)] pr-6">
                    <div className="relative flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 shadow-sm ${status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    </div>
                    <span className="text-[11px] font-medium tracking-wide text-[var(--text-primary)] uppercase">
                        {status === 'active' ? 'En Vivo' : status}
                    </span>
                </div>

                {/* IP Toggle (New Debug Feature) */}
                <button
                    onClick={toggleHost}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--bg-hover)] text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-color)] transition-all"
                    title={`Cambiar Host del Visor (Actual: ${forceHost})`}
                >
                    <RefreshCw size={10} />
                    <span className="font-mono">{forceHost}</span>
                </button>

                {/* Zoom Controls */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                        className="p-1.5 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95"
                    >
                        <Minimize2 size={14} />
                    </button>
                    <span className="text-[10px] font-mono w-10 text-center text-[var(--text-muted)] font-medium">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={() => setScale(s => Math.min(1.5, s + 0.1))}
                        className="p-1.5 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95"
                    >
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#121212] dark:bg-[#121212] bg-zinc-100">
                {status === 'active' && wsUrl ? (
                    <div
                        style={{
                            transform: `scale(${scale})`,
                            width: '100%',
                            height: '100%',
                            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        className="origin-center w-full h-full shadow-2xl flex items-center justify-center"
                    >
                        <Screencast
                            wsUrl={wsUrl}
                            className="max-w-full max-h-full shadow-2xl"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-4 opacity-50">
                        {status === 'waiting' && <Loader2 size={32} className="animate-spin text-[var(--text-secondary)]" />}
                        {status === 'error' && <Wifi size={32} className="text-red-400" />}
                        <span className="text-xs font-mono text-[var(--text-muted)] tracking-widest uppercase">
                            {status === 'connecting' ? 'Iniciando conexión...' :
                                status === 'waiting' ? 'Esperando Agente...' :
                                    'Sistema Offline'}
                        </span>
                    </div>
                )}
            </div>

            {/* Soft Noise */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay"></div>
        </div>
    );
}

'use client';
import React, { useEffect, useRef, useState } from 'react';

export default function Screencast({ wsUrl, className }) {
    const canvasRef = useRef(null);
    const [status, setStatus] = useState('connecting'); // connecting | connected | error
    const wsRef = useRef(null);
    const frameIdRef = useRef(null);

    useEffect(() => {
        if (!wsUrl) return;

        // Clean up previous connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        setStatus('connecting');
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('📷 Screencast WS Connected');
            setStatus('connected');
            // Start Screencast with specific format
            ws.send(JSON.stringify({
                id: 1,
                method: 'Page.startScreencast',
                params: {
                    format: 'jpeg',
                    quality: 70,
                    maxWidth: 1280,
                    maxHeight: 720,
                    everyNthFrame: 1 // Send every frame for smoothness, increase if bandwidth is tight
                }
            }));
        };

        ws.onmessage = async (event) => {
            try {
                const msg = JSON.parse(event.data);

                if (msg.method === 'Page.screencastFrame') {
                    const { data, sessionId, metadata } = msg.params;

                    // Render to Canvas
                    if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d');
                        const img = new Image();
                        img.onload = () => {
                            // Clear and draw new frame
                            canvasRef.current.width = img.width;
                            canvasRef.current.height = img.height;
                            ctx.drawImage(img, 0, 0);

                            // Acknowledge frame ONLY after rendering (Flow Control)
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    id: msg.id || 2,
                                    method: 'Page.screencastFrameAck',
                                    params: { sessionId: sessionId }
                                }));
                            }
                        };
                        img.src = `data:image/jpeg;base64,${data}`;
                    }
                }
            } catch (e) {
                console.error('Screencast decode error:', e);
            }
        };

        ws.onerror = (e) => {
            console.error('Screencast WS Error:', e);
            setStatus('error');
        };

        ws.onclose = () => {
            console.log('📷 Screencast WS Closed');
            if (status !== 'error') setStatus('disconnected');
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify({ id: 3, method: 'Page.stopScreencast' }));
                } catch (e) { }
                ws.close();
            }
        };
    }, [wsUrl]);

    if (status === 'error') {
        return (
            <div className={`flex items-center justify-center bg-black/10 text-red-400 text-xs font-mono p-4 ${className}`}>
                ⚠️ Signal Lost
            </div>
        );
    }

    // Keep the container size but let canvas scale
    return (
        <div className={`relative flex items-center justify-center w-full h-full ${className}`}>
            {!status || status === 'connecting' ? (
                <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-xs animate-pulse">
                    Waiting for Stream...
                </div>
            ) : null}
            <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain shadow-2xl"
            />
        </div>
    );
}

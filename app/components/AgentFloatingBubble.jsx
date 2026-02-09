'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AgentFloatingBubble({ suiteId }) {
    const router = useRouter();
    const [dismissed, setDismissed] = useState(false);

    const handleClick = () => {
        router.push(`/execution?suite_id=${suiteId}`);
    };

    const handleDismiss = (e) => {
        e.stopPropagation();
        setDismissed(true);
    };

    if (dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-6 right-6 z-50"
            >
                <div className="relative">
                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 z-10"
                        title="Cerrar"
                    >
                        <X size={14} />
                    </button>

                    {/* Main Bubble */}
                    <button
                        onClick={handleClick}
                        className="flex items-center gap-3 px-6 py-3 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-lg hover:shadow-xl transition-all smooth-transition"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <Activity size={20} />
                        </div>
                        <span className="text-sm font-bold">AGENTE EN EJECUCIÓN</span>
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/20">
                            <Eye size={16} />
                            <span className="text-xs font-bold">VER</span>
                        </div>
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

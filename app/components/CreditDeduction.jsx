'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins } from 'lucide-react';
import React from 'react';

export default function CreditDeduction({ amount, isVisible, onComplete }) {
    return (
        <AnimatePresence onExitComplete={onComplete}>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -100, transition: { duration: 0.5 } }}
                    className="fixed bottom-10 right-10 z-[100] pointer-events-none"
                >
                    <div className="relative">
                        {/* Floating particles effect could be added here */}
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.6)] flex items-center gap-2 border-2 border-white/20">
                            <Coins size={24} className="text-white animate-bounce" />
                            <span className="text-xl font-black text-white px-2 drop-shadow-md">
                                -{amount} VIGAS
                            </span>
                        </div>

                        {/* Echo effect */}
                        <motion.div
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 2, opacity: 0 }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="absolute inset-0 bg-amber-400 rounded-full -z-10"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

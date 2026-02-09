'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Button from './Button';
import { X } from 'lucide-react';

export default function LocatorEditor({ stepId, currentSelector, currentActionType, onSave, onCancel }) {
    const [selector, setSelector] = useState(currentSelector || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await supabase
                .from('test_steps')
                .update({ selector })
                .eq('id', stepId);

            onSave(selector);
        } catch (error) {
            console.error('Error saving locator:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-secondary)] p-6 rounded-lg border border-[var(--border-color)] max-w-2xl w-full animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                        EDITAR LOCATOR
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] smooth-transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                        TIPO DE ACCIÓN
                    </label>
                    <div className="px-3 py-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-color)]">
                        <code className="text-sm text-[var(--accent-primary)] font-mono">
                            {currentActionType || 'N/A'}
                        </code>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                        SELECTOR CSS / XPATH
                    </label>
                    <textarea
                        className="input font-mono text-sm w-full h-32 resize-none"
                        value={selector}
                        onChange={(e) => setSelector(e.target.value)}
                        placeholder="Ej: button.submit-btn, //button[@id='submit']"
                    />
                </div>

                <div className="flex gap-3">
                    <Button variant="primary" onClick={handleSave} disabled={saving || !selector}>
                        {saving ? 'GUARDANDO...' : 'GUARDAR'}
                    </Button>
                    <Button variant="secondary" onClick={onCancel}>
                        CANCELAR
                    </Button>
                </div>
            </div>
        </div>
    );
}

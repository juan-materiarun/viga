'use client';

export default function LoadingSpinner({ size = 'md', className = '' }) {
    const sizes = {
        sm: 'w-6 h-6 border-2',
        md: 'w-10 h-10 border-3',
        lg: 'w-16 h-16 border-4',
    };

    return (
        <div className={`spinner ${sizes[size]} ${className}`} />
    );
}

export function LoadingScreen({ message = 'CARGANDO...' }) {
    return (
        <div className="fixed inset-0 bg-[var(--bg-primary)] flex flex-col items-center justify-center z-[99999] animate-fade-in">
            <LoadingSpinner size="lg" />
            <p className="mt-6 text-sm font-semibold text-[var(--text-secondary)]">{message}</p>
        </div>
    );
}

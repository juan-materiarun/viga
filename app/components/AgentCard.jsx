import { LucideIcon } from 'lucide-react';

export default function AgentCard({ id, title, description, icon: Icon, selected, onClick, color, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                relative group flex flex-col p-5 rounded-xl transition-all duration-200 text-left w-full
                border-2 
                ${selected
                    ? 'bg-[var(--bg-secondary)] border-[var(--accent-primary)] shadow-sm'
                    : 'bg-[var(--bg-base)] border-[var(--border-color)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
            `}
            style={selected ? { borderColor: color } : {}}
        >
            <div className="flex items-start justify-between w-full mb-3">
                <div
                    className={`p-3 rounded-lg transition-colors duration-200`}
                    style={{
                        backgroundColor: selected ? `${color}20` : 'var(--bg-secondary)',
                        color: selected ? color : 'var(--text-muted)'
                    }}
                >
                    <Icon size={24} strokeWidth={2} />
                </div>

                {selected && (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                )}
            </div>

            <h3 className={`text-base font-bold mb-1 ${selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                {title}
            </h3>

            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {description}
            </p>
        </button>
    );
}

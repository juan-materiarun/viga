import { LucideIcon } from 'lucide-react';

export default function AgentCard({ id, title, description, icon: Icon, selected, onClick, color, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={selected ? {
                borderColor: color,
                backgroundColor: `${color}1A`, // 10% opacity
                boxShadow: `0 0 30px -5px ${color}`
            } : {}}
            className={`
                relative group flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-300
                border-2 backdrop-blur-md overflow-hidden
                ${selected
                    ? `scale-105`
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 hover:scale-102'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
            `}
        >
            {/* Background Gradient Effect */}
            <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
                style={{ backgroundImage: `linear-gradient(to bottom right, ${color}, transparent)` }}
            />

            {/* Icon Circle */}
            <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300`}
                style={selected ? { backgroundColor: color, color: '#000' } : { backgroundColor: 'rgba(255,255,255,0.05)', color: color }}
            >
                <Icon size={32} strokeWidth={2} />
            </div>

            {/* Content */}
            <h3 className={`text-xl font-bold mb-2 transition-colors ${selected ? 'text-white' : 'text-gray-200'}`}>
                {title}
            </h3>

            <p className="text-sm text-gray-400 text-center leading-relaxed">
                {description}
            </p>

            {/* Selection Indicator */}
            <div
                className={`absolute top-4 right-4 w-3 h-3 rounded-full transition-all duration-300`}
                style={selected ? { backgroundColor: color, boxShadow: `0 0 10px ${color}` } : { backgroundColor: 'transparent' }}
            />
        </button>
    );
}

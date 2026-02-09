'use client';

export default function Loader({ fullScreen = false, size = 'medium', className = '' }) {
    const sizeClasses = {
        small: 'w-12 h-12',
        medium: 'w-24 h-24',
        large: 'w-40 h-40',
        xl: 'w-56 h-56'
    };

    const content = (
        <div className={`relative flex items-center justify-center ${sizeClasses[size] || sizeClasses.medium}`}>
            <video
                src="/loader.webm"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
                style={{
                    mixBlendMode: 'lighten',
                    filter: 'contrast(1.2) brightness(0.9)',
                    clipPath: 'circle(42% at 50% 50%)',
                    WebkitClipPath: 'circle(42% at 50% 50%)'
                }}
            />
        </div>
    );

    if (fullScreen) {
        return (
            // Opaque background ensures consistent rendering context on all pages
            <div className={`absolute inset-0 z-50 bg-[#121212] transition-opacity duration-300 ${className}`}>
                <div className="sticky top-0 left-0 w-full h-screen flex items-center justify-center">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full h-full flex items-center justify-center p-4 ${className}`}>
            {content}
        </div>
    );
}

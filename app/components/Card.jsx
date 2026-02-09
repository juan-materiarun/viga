'use client';

export default function Card({
    children,
    className = '',
    hover = true,
    onClick,
    ...props
}) {
    const hoverStyles = hover ? 'hover:shadow-md' : '';
    const clickableStyles = onClick ? 'cursor-pointer' : '';

    return (
        <div
            onClick={onClick}
            className={`card ${hoverStyles} ${clickableStyles} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

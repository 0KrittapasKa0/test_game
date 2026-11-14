import { useId } from 'react';

export const ChipIcon = ({ className = 'w-5 h-5' }: { className?: string }) => {
    const uid = useId();
    const goldRimId = `${uid}-goldRim`;
    const mainRedId = `${uid}-mainRed`;
    const coreRedId = `${uid}-coreRed`;
    const stripeId = `${uid}-stripe`;
    const bevelId = `${uid}-bevel`;

    return (
        <svg
            className={`shrink-0 ${className} drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.65)]`}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id={goldRimId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="45%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#92400e" />
                </linearGradient>

                <linearGradient id={mainRedId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>

                <linearGradient id={coreRedId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#7f1d1d" />
                </linearGradient>

                <linearGradient id={stripeId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e4e4e7" />
                </linearGradient>

                <linearGradient id={bevelId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.32" />
                </linearGradient>
            </defs>

            {/* Outer 3D gold rim & bottom thickness */}
            <circle cx="50" cy="51.5" r="48" fill="#78350f" />
            <circle cx="50" cy="50" r="48" fill={`url(#${goldRimId})`} />

            {/* Main crimson chip face */}
            <circle cx="50" cy="50" r="43.5" fill={`url(#${mainRedId})`} />

            {/* 6 high-contrast ivory casino edge inlays */}
            {[0, 60, 120, 180, 240, 300].map(angle => (
                <path
                    key={angle}
                    d="M 42 6.5 L 58 6.5 L 55.5 18.5 L 44.5 18.5 Z"
                    fill={`url(#${stripeId})`}
                    transform={`rotate(${angle} 50 50)`}
                />
            ))}

            {/* Subtle lighting bevel */}
            <circle cx="50" cy="50" r="43.5" fill={`url(#${bevelId})`} />

            {/* Inner gold trim & recessed core */}
            <circle cx="50" cy="50" r="32" fill="#92400e" />
            <circle cx="50" cy="50" r="30.5" fill={`url(#${coreRedId})`} stroke="#fde68a" strokeWidth="1.8" strokeOpacity="0.7" />

            {/* Dashed inner casino ring */}
            <circle
                cx="50"
                cy="50"
                r="25.5"
                fill="none"
                stroke="#fef3c7"
                strokeWidth="2"
                strokeDasharray="5 4"
                strokeOpacity="0.85"
            />

            {/* Center Spade emblem (crisp without SVG filter overhead) */}
            <g transform="translate(50, 50) scale(0.68) translate(-50, -50)">
                <path
                    d="M50 20 C50 20 27 44 27 60 C27 72 39.5 75 46 66 C49.5 61 50 61 48 73 L40 83 L60 83 L52 73 C50 61 50.5 61 54 66 C60.5 75 73 72 73 60 C73 44 50 20 50 20 Z"
                    fill="#000000"
                    fillOpacity="0.3"
                    transform="translate(0, 2)"
                />
                <path
                    d="M50 20 C50 20 27 44 27 60 C27 72 39.5 75 46 66 C49.5 61 50 61 48 73 L40 83 L60 83 L52 73 C50 61 50.5 61 54 66 C60.5 75 73 72 73 60 C73 44 50 20 50 20 Z"
                    fill="#ffffff"
                />
            </g>

            {/* Top specular rim shine */}
            <path
                d="M 14 48 A 36 36 0 0 1 86 48"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.6"
                strokeOpacity="0.45"
                pointerEvents="none"
            />
        </svg>
    );
};

// Reusable scalable Chip Bag Icon
export const ChipBagIcon = ({ className = "w-12 h-12", isBig = false }: { className?: string; isBig?: boolean }) => {
    // Elegant colors for the chip bag
    const bagColor = isBig ? '#ca8a04' : '#b91c1c'; // Gold for big, Red for standard
    const bagDark = isBig ? '#854d0e' : '#7f1d1d';
    const bagLight = isBig ? '#eab308' : '#ef4444';
    const bagHighlight = isBig ? '#fef08a' : '#fca5a5';

    return (
        <svg
            className={`shrink-0 ${className} drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]`}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                {/* Bag Body Gradient */}
                <linearGradient id={`bagGradient-${isBig}`} x1="0" y1="0.2" x2="0" y2="1">
                    <stop offset="0%" stopColor={bagLight} />
                    <stop offset="40%" stopColor={bagColor} />
                    <stop offset="100%" stopColor={bagDark} />
                </linearGradient>

                {/* Rope Tie Gradient */}
                <linearGradient id="ropeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#d4d4d8" />
                    <stop offset="50%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#a1a1aa" />
                </linearGradient>

                {/* Inner Shadow for Volume */}
                <filter id="bagVolumetric">
                    <feDropShadow dx="-2" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
                </filter>
            </defs>

            {/* Back rim of the open bag top */}
            <path d="M 30 25 C 50 15 70 25 70 25 L 65 35 L 35 35 Z" fill={bagDark} />

            {/* Chips spilling out of the top */}
            <circle cx="45" cy="22" r="8" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
            <circle cx="45" cy="22" r="5" fill="none" stroke="#ca8a04" strokeDasharray="2 2" />

            <circle cx="58" cy="25" r="7" fill="#dc2626" stroke="#991b1b" strokeWidth="1" />
            <circle cx="58" cy="25" r="4" fill="none" stroke="#991b1b" strokeDasharray="2 2" />

            <circle cx="40" cy="28" r="9" fill="#1e3a8a" stroke="#172554" strokeWidth="1" />
            <circle cx="40" cy="28" r="5" fill="none" stroke="#172554" strokeDasharray="2 2" />

            <circle cx="52" cy="30" r="10" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
            <circle cx="52" cy="30" r="6" fill="none" stroke="#ca8a04" strokeDasharray="2 2" />

            {/* Main Bag Body */}
            <path
                d="M 35 32 C 10 40 15 85 25 95 C 40 98 60 98 75 95 C 85 85 90 40 65 32 C 55 35 45 35 35 32 Z"
                fill={`url(#bagGradient-${isBig})`}
                filter="url(#bagVolumetric)"
            />

            {/* Bag Folds/Creases for realistic 3D look */}
            <path d="M 35 45 C 40 65 30 85 30 85" fill="none" stroke={bagDark} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <path d="M 65 45 C 60 65 70 85 70 85" fill="none" stroke={bagDark} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <path d="M 50 40 L 50 90" fill="none" stroke={bagDark} strokeWidth="3" strokeLinecap="round" opacity="0.4" />

            {/* Front Lip of the bag */}
            <path d="M 28 30 C 50 40 72 30 72 30 C 65 35 35 35 28 30 Z" fill={bagHighlight} opacity="0.8" />

            {/* Rope / String Tie */}
            <path d="M 30 35 C 50 42 70 35 70 35" fill="none" stroke="url(#ropeGradient)" strokeWidth="4" strokeLinecap="round" />
            {/* Rope knot */}
            <circle cx="50" cy="38" r="3" fill="#ffffff" />
            <path d="M 50 38 L 45 45 M 50 38 L 55 48" fill="none" stroke="url(#ropeGradient)" strokeWidth="2" strokeLinecap="round" />

            {/* Gold Dollar Sign on the bag */}
            <text
                x="50" y="70"
                fontFamily="sans-serif"
                fontSize={isBig ? "32" : "28"}
                fontWeight="900"
                textAnchor="middle"
                fill="#fde047"
                opacity="0.9"
                filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.4))"
            >
                $
            </text>

            {/* Bag Surface Shine/Highlight */}
            <path
                d="M 35 32 C 20 40 22 70 30 80 C 40 60 40 40 35 32 Z"
                fill="#ffffff"
                opacity="0.15"
                style={{ mixBlendMode: 'overlay' }}
            />
        </svg>
    );
};

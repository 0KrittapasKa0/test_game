export const ChipIcon = ({ className = "w-5 h-5" }: { className?: string }) => {
    return (
        <svg
            className={`shrink-0 ${className} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                {/* Main Chip Gradient (Base Red) */}
                <linearGradient id="chipMainRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>

                {/* White Edge Stripes Gradient */}
                <linearGradient id="chipWhiteStripe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f4f4f5" />
                    <stop offset="100%" stopColor="#d4d4d8" />
                </linearGradient>

                {/* Outer Rim Bevel Gradient */}
                <linearGradient id="chipOuterBevel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
                </linearGradient>

                {/* Inner Bevel Gradient */}
                <linearGradient id="chipInnerBevel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#991b1b" />
                    <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
            </defs>

            {/* Base Background Bevel (Edge of the chip) */}
            <circle cx="50" cy="50" r="49" fill="#991b1b" />

            {/* Base Red Chip Background */}
            <circle cx="50" cy="50" r="48" fill="url(#chipMainRed)" />

            {/* Outer Rim Highlight */}
            <circle cx="50" cy="50" r="48" fill="url(#chipOuterBevel)" />

            {/* 6 White Edge Stripes (Classic Casino Style) */}
            {/* The white block edge */}
            {[0, 60, 120, 180, 240, 300].map(angle => (
                <path
                    key={angle}
                    d="M 50 2 L 62 2 C 58 12 58 12 60 16 L 40 16 C 42 12 42 12 38 2 Z"
                    fill="url(#chipWhiteStripe)"
                    transform={`rotate(${angle} 50 50)`}
                />
            ))}

            {/* Inner Red Core cutting off the stripes */}
            <circle cx="50" cy="50" r="32" fill="url(#chipMainRed)" />

            {/* Inner Red Core Bevel edge */}
            <circle cx="50" cy="50" r="32" fill="none" stroke="url(#chipInnerBevel)" strokeWidth="2" />
            <circle cx="50" cy="50" r="31" fill="none" stroke="#dc2626" strokeWidth="1" />
            <circle cx="50" cy="50" r="33" fill="none" stroke="#7f1d1d" strokeWidth="1" />

            {/* Inner dashed ring (authentic chip trait, white color) */}
            <circle cx="50" cy="50" r="28" fill="none" stroke="#f4f4f5" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.9" />

            {/* Center Spade Symbol (White) */}
            <g transform="translate(50, 50) scale(0.65) translate(-50, -50)">
                <path
                    d="M50 22 C50 22 28 45 28 60 C28 72 40 75 46 66 C50 60 50 60 48 72 L40 82 L60 82 L52 72 C50 60 50 60 54 66 C60 75 72 72 72 60 C72 45 50 22 50 22 Z"
                    fill="#ffffff"
                    filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.3))"
                />
            </g>

            {/* Shiny 3D Top Rim Highlight */}
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" pointerEvents="none" />
        </svg>
    );
};

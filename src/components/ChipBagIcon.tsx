// Premium, highly detailed Chip Bag Icon for the casino theme
export const ChipBagIcon = ({ className = "w-12 h-12", isBig = false }: { className?: string; isBig?: boolean }) => {
    // 🔴 Standard Bag (Days 1-6): Deep Red Velvet
    // 🟡 Big Bag (Day 7): Royal Dark Gold / Obsidian Leather

    const bagLight = isBig ? '#fde047' : '#ef4444'; // Top highlight
    const bagMid = isBig ? '#b45309' : '#b91c1c';   // Mid tone
    const bagDark = isBig ? '#451a03' : '#7f1d1d';  // Shadow
    const bagDeep = isBig ? '#1c0a00' : '#450a0a';  // Deepest crease

    const ropeLight = isBig ? '#fef08a' : '#e4e4e7';
    const ropeDark = isBig ? '#a16207' : '#71717a';

    const glowColor = isBig ? 'rgba(234,179,8,0.4)' : 'rgba(239,68,68,0.3)';

    return (
        <svg
            className={`shrink-0 ${className} drop-shadow-2xl`}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                {/* Bag Body Gradient */}
                <linearGradient id={`bagGrad-${isBig}`} x1="0.3" y1="0" x2="0.7" y2="1">
                    <stop offset="0%" stopColor={bagLight} />
                    <stop offset="30%" stopColor={bagMid} />
                    <stop offset="80%" stopColor={bagDark} />
                    <stop offset="100%" stopColor={bagDeep} />
                </linearGradient>

                {/* Inner Bag Gradient (Darkness inside) */}
                <linearGradient id="innerBagGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#111" />
                    <stop offset="100%" stopColor={bagDark} />
                </linearGradient>

                {/* Rope Gradient */}
                <linearGradient id={`ropeGrad-${isBig}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ropeLight} />
                    <stop offset="100%" stopColor={ropeDark} />
                </linearGradient>

                {/* Glowing Aura for Big Bag */}
                <radialGradient id="auraGlow" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor={glowColor} stopOpacity="1" />
                    <stop offset="50%" stopColor={glowColor} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
                </radialGradient>

                {/* Gold Gradient for Chips */}
                <radialGradient id="goldChipGrad" cx="0.4" cy="0.3" r="0.7">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="40%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#a16207" />
                </radialGradient>

                {/* Drop shadow filter for volumetric look */}
                <filter id="volumetricShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="-2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
                </filter>

                {/* Soft glow for magic effect */}
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Background Aura (Only for Big Bag) */}
            {isBig && (
                <circle cx="50" cy="50" r="45" fill="url(#auraGlow)" />
            )}

            {/* Back inner lip of the bag */}
            <path d="M 26 28 C 50 16 74 28 74 28 C 74 28 65 38 50 38 C 35 38 26 28 26 28 Z" fill="url(#innerBagGrad)" />

            {/* ─── Casino Chips Spilling Out ─── */}

            {/* Back Layer Chips */}
            <g transform="translate(30, 18) scale(0.8)">
                <circle cx="20" cy="20" r="12" fill="url(#goldChipGrad)" stroke="#78350f" strokeWidth="1" />
                <circle cx="20" cy="20" r="8" fill="none" stroke="#78350f" strokeWidth="1" strokeDasharray="3 2" />
            </g>
            <g transform="translate(55, 20) scale(0.7)">
                <circle cx="20" cy="20" r="12" fill="#22c55e" stroke="#064e3b" strokeWidth="1" />
                <circle cx="20" cy="20" r="8" fill="none" stroke="#064e3b" strokeWidth="1" strokeDasharray="3 2" />
            </g>

            {/* Mid Layer Chips */}
            <g transform="translate(42, 14) scale(0.9)">
                <circle cx="20" cy="20" r="12" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1" />
                {/* Edge stripes */}
                <line x1="20" y1="8" x2="20" y2="11" stroke="#ffffff" strokeWidth="2" />
                <line x1="20" y1="32" x2="20" y2="29" stroke="#ffffff" strokeWidth="2" />
                <line x1="8" y1="20" x2="11" y2="20" stroke="#ffffff" strokeWidth="2" />
                <line x1="32" y1="20" x2="29" y2="20" stroke="#ffffff" strokeWidth="2" />
                <circle cx="20" cy="20" r="8" fill="none" stroke="#7f1d1d" strokeWidth="1" />
            </g>

            <g transform="translate(25, 25) scale(0.85)">
                <circle cx="20" cy="20" r="12" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1" />
                <circle cx="20" cy="20" r="8" fill="none" stroke="#1e3a8a" strokeWidth="1" strokeDasharray="3 2" />
            </g>

            {/* Front Big Gold Chip (Hero Chip) */}
            <g transform="translate(48, 22)">
                <circle cx="0" cy="0" r="14" fill="url(#goldChipGrad)" stroke="#78350f" strokeWidth="1.5" filter="url(#volumetricShadow)" />
                {/* Premium Edge */}
                <line x1="0" y1="-14" x2="0" y2="-10" stroke="#78350f" strokeWidth="2" />
                <line x1="0" y1="14" x2="0" y2="10" stroke="#78350f" strokeWidth="2" />
                <line x1="-14" y1="0" x2="-10" y2="0" stroke="#78350f" strokeWidth="2" />
                <line x1="14" y1="0" x2="10" y2="0" stroke="#78350f" strokeWidth="2" />
                <circle cx="0" cy="0" r="9" fill="none" stroke="#ca8a04" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="7" fill="none" stroke="#a16207" strokeWidth="1" strokeDasharray="3 2" />
                {/* Star center */}
                <path d="M 0 -3 L 1 -1 L 3 -1 L 1.5 0.5 L 2 2.5 L 0 1.5 L -2 2.5 L -1.5 0.5 L -3 -1 L -1 -1 Z" fill="#78350f" />
                {/* Highlight */}
                <path d="M -8 -8 Q 0 -12 8 -8" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            </g>

            {/* ─── Main Bag Body ─── */}
            <path
                d="M 32 36 C 8 45 12 85 24 94 C 38 99 62 99 76 94 C 88 85 92 45 68 36 C 58 40 42 40 32 36 Z"
                fill={`url(#bagGrad-${isBig})`}
                filter="url(#volumetricShadow)"
            />

            {/* Volumetric Creases (3D folding effect) */}
            <path d="M 32 46 C 38 65 28 88 28 88" fill="none" stroke={bagDeep} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            <path d="M 36 40 C 45 60 38 80 40 92" fill="none" stroke={bagDeep} strokeWidth="4" strokeLinecap="round" opacity="0.5" />
            <path d="M 68 46 C 62 65 72 88 72 88" fill="none" stroke={bagDeep} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            <path d="M 64 40 C 55 60 62 80 60 92" fill="none" stroke={bagDeep} strokeWidth="4" strokeLinecap="round" opacity="0.5" />
            <path d="M 50 42 C 48 55 52 75 50 90" fill="none" stroke={bagDeep} strokeWidth="5" strokeLinecap="round" opacity="0.4" />

            {/* Front Lip folded over */}
            <path d="M 25 32 C 45 44 55 44 75 32 C 75 32 68 38 50 38 C 32 38 25 32 25 32 Z" fill={bagLight} opacity="0.4" />

            {/* ─── Golden Rope Tie ─── */}
            <path d="M 28 36 C 45 44 55 44 72 36" fill="none" stroke={`url(#ropeGrad-${isBig})`} strokeWidth="5" strokeLinecap="round" filter="url(#volumetricShadow)" />
            {/* Wrap around */}
            <path d="M 32 38 C 45 46 55 46 68 38" fill="none" stroke="#451a03" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

            {/* Rope Knot */}
            <circle cx="50" cy="41" r="4.5" fill={`url(#ropeGrad-${isBig})`} stroke={bagDeep} strokeWidth="1" filter="url(#volumetricShadow)" />
            <path d="M 48 44 C 42 55 40 65 40 65" fill="none" stroke={`url(#ropeGrad-${isBig})`} strokeWidth="3" strokeLinecap="round" />
            <path d="M 53 43 C 58 52 62 60 62 60" fill="none" stroke={`url(#ropeGrad-${isBig})`} strokeWidth="3" strokeLinecap="round" />
            {/* Tassels */}
            <line x1="40" y1="65" x2="38" y2="70" stroke={`url(#ropeGrad-${isBig})`} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="40" y1="65" x2="42" y2="70" stroke={`url(#ropeGrad-${isBig})`} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="62" y1="60" x2="60" y2="65" stroke={`url(#ropeGrad-${isBig})`} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="62" y1="60" x2="64" y2="65" stroke={`url(#ropeGrad-${isBig})`} strokeWidth="1.5" strokeLinecap="round" />

            {/* ─── Premium Emblem / Logo on the Bag ─── */}
            <circle cx="50" cy="65" r="14" fill="#111" stroke="#f59e0b" strokeWidth="2" filter="url(#volumetricShadow)" />
            <circle cx="50" cy="65" r="10" fill="none" stroke="#b45309" strokeWidth="1" strokeDasharray="2 2" />

            <text
                x="50" y="73"
                fontFamily="sans-serif"
                fontSize={isBig ? "24" : "22"}
                fontWeight="900"
                textAnchor="middle"
                fill="url(#goldChipGrad)"
                style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.8)" }}
            >
                $
            </text>

            {/* ─── Highlights for Leather/Velvet Sheen ─── */}
            <path
                d="M 32 38 C 16 46 22 70 28 80 C 40 65 38 45 32 38 Z"
                fill="#ffffff"
                opacity={isBig ? "0.1" : "0.15"}
                style={{ mixBlendMode: 'overlay' }}
            />
            <path
                d="M 68 38 C 76 45 74 65 68 76 C 60 62 62 48 68 38 Z"
                fill="#ffffff"
                opacity="0.08"
                style={{ mixBlendMode: 'overlay' }}
            />

            {/* ─── Magical Sparkles ─── */}
            <g filter="url(#softGlow)">
                {/* Big Sparkle */}
                <path d="M 50 2 L 52 10 L 60 12 L 52 14 L 50 22 L 48 14 L 40 12 L 48 10 Z" fill="#fef08a" opacity="0.9" />
                <circle cx="50" cy="12" r="3" fill="#ffffff" />

                {/* Small Sparkles */}
                <path d="M 28 8 L 29 12 L 33 13 L 29 14 L 28 18 L 27 14 L 23 13 L 27 12 Z" fill="#fef08a" opacity="0.8" />
                <path d="M 75 25 L 76 28 L 79 29 L 76 30 L 75 33 L 74 30 L 71 29 L 74 28 Z" fill="#fef08a" opacity="0.7" />

                {/* Tiny dots */}
                <circle cx="20" cy="22" r="1.5" fill="#ffffff" opacity="0.6" />
                <circle cx="82" cy="18" r="2" fill="#fef08a" opacity="0.8" />
                <circle cx="68" cy="8" r="1" fill="#ffffff" opacity="0.5" />
            </g>
        </svg>
    );
};

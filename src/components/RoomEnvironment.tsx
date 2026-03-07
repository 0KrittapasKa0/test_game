import { memo, useMemo } from 'react';
// imports

interface RoomEnvironmentProps {
    category: 'STANDARD' | 'HIGH_STAKES' | 'EXPERT' | 'LEGENDARY' | 'ULTIMATE';
}

export const RoomEnvironment = memo(function RoomEnvironment({ category }: RoomEnvironmentProps) {
    if (category === 'STANDARD') {
        return null; // Classic green table, no extra particles
    }

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {category === 'HIGH_STAKES' && <DustParticles />}
            {category === 'EXPERT' && <MysticAura />}
            {category === 'LEGENDARY' && <FireEmbers />}
            {category === 'ULTIMATE' && <CosmicVoid />}
        </div>
    );
});

// ─── High Stakes: Luxury Dust Sparkles (Optimized Native CSS) ───────────────────────────
const DustParticles = memo(() => {
    // Generate fewer, larger fading particles to simulate luxury dust without overhead
    const particles = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // %
        y: Math.random() * 100, // %
        size: Math.random() * 4 + 2, // 2-6px
        duration: Math.random() * 15 + 10, // 10-25s
        delay: Math.random() * -20 // random start phase
    })), []);

    return (
        <div className="absolute inset-0 opacity-70 pointer-events-none z-0">
            <style>{`
                @keyframes dust-anim {
                    0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
                    25% { transform: translate(5%, -10%) scale(1.2); opacity: 0.8; }
                    50% { transform: translate(-5%, -20%) scale(0.8); opacity: 0.4; }
                    75% { transform: translate(2%, -25%) scale(1.5); opacity: 0.9; }
                    100% { transform: translate(0, -30%) scale(0.5); opacity: 0; }
                }
            `}</style>
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        // Use a radial gradient instead of box-shadow or blur
                        background: 'radial-gradient(circle at center, rgba(255,255,255,1) 0%, rgba(255,255,255,0.2) 60%, transparent 100%)',
                        animation: `dust-anim ${p.duration}s linear ${p.delay}s infinite`,
                        willChange: 'transform, opacity'
                    }}
                />
            ))}
        </div>
    );
});

// ─── Expert: Mystical Purple Aurora (Flowing & Elegant - Native CSS) ─────────────────────
const MysticAura = memo(() => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <style>{`
                @keyframes aura-rotate-cw {
                    0% { transform: rotate(0deg) scale(0.9); }
                    50% { transform: rotate(180deg) scale(1.1); }
                    100% { transform: rotate(360deg) scale(0.9); }
                }
                @keyframes aura-rotate-ccw {
                    0% { transform: rotate(0deg) scale(1.1); }
                    50% { transform: rotate(-180deg) scale(0.9); }
                    100% { transform: rotate(-360deg) scale(1.1); }
                }
                @keyframes aura-pulse {
                    0%, 100% { opacity: 0.15; }
                    50% { opacity: 0.35; }
                }
            `}</style>
            {/* 1. Deep Violet Foundation - REMOVED mix-blend-screen */}
            <div className="absolute inset-0 opacity-80"
                style={{ background: 'radial-gradient(circle at 50% 120%, rgba(88,28,135,0.7) 0%, transparent 80%)' }} />

            {/* 2. Slow Flowing Purple Auroras (Layer 1) - Native CSS */}
            <div
                className="absolute -inset-[50%] opacity-40"
                style={{
                    background: `
                        radial-gradient(ellipse at 30% 40%, rgba(168,85,247,0.3) 0%, transparent 60%),
                        radial-gradient(ellipse at 70% 60%, rgba(216,180,254,0.2) 0%, transparent 50%)
                    `,
                    animation: 'aura-rotate-cw 35s ease-in-out infinite',
                    willChange: 'transform'
                }}
            />

            {/* 3. Slow Flowing Pink/Magenta Auroras (Layer 2 - Counter rotating) */}
            <div
                className="absolute -inset-[50%] opacity-30"
                style={{
                    background: `
                        radial-gradient(ellipse at 60% 30%, rgba(232,121,249,0.2) 0%, transparent 60%),
                        radial-gradient(ellipse at 40% 70%, rgba(192,38,211,0.2) 0%, transparent 50%)
                    `,
                    animation: 'aura-rotate-ccw 45s ease-in-out infinite',
                    willChange: 'transform'
                }}
            />

            {/* 4. Center Soft Focus Glow over the table */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full z-10"
                style={{
                    background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)',
                    animation: 'aura-pulse 6s ease-in-out infinite'
                }}
            />

            {/* Subtle dark framing vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(10,5,25,0.7)_100%)] z-20 pointer-events-none" />
        </div>
    );
});

// ─── Legendary: Fire Embers (Optimized Native CSS) ──────────────────────────────────────
const FireEmbers = memo(() => {
    // Reduced count, larger size spread
    const embers = useMemo(() => Array.from({ length: 25 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // %
        size: Math.random() * 8 + 4, // 4-12px (bigger means softer gradients)
        duration: Math.random() * 4 + 3, // 3-7s (faster)
        delay: Math.random() * -10,
        swayX: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 50 + 20) // CSS variable target
    })), []);

    return (
        <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
            <style>{`
                @keyframes ember-anim {
                    0% { transform: translateY(100px) translateX(0); opacity: 0; }
                    20% { opacity: 1; }
                    50% { transform: translateY(-30vh) translateX(var(--ember-sway-half)); opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(-100vh) translateX(var(--ember-sway)); opacity: 0; }
                }
            `}</style>

            {/* Dark vignette (lighter for mobile) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.7)_100%)] z-10" />

            {/* Heat glow from bottom - static radial gradient */}
            <div className="absolute -bottom-40 left-0 w-full h-[300px] opacity-40 z-0"
                style={{ background: 'radial-gradient(ellipse at bottom, rgba(220,38,38,0.8) 0%, rgba(220,38,38,0) 70%)' }} />

            {/* Embers */}
            <div className="absolute inset-0 z-20">
                {embers.map(e => {
                    const isOrange = Math.random() > 0.5;
                    const colorCore = isOrange ? '245,158,11' : '239,68,68';
                    return (
                        <div
                            key={e.id}
                            className="absolute bottom-0 rounded-full"
                            style={{
                                width: e.size,
                                height: e.size,
                                left: `${e.x}%`,
                                // Simulated glow using radial gradient, zero box-shadow
                                background: `radial-gradient(circle at center, rgba(${colorCore},1) 0%, rgba(${colorCore},0.4) 40%, transparent 100%)`,
                                '--ember-sway-half': `${e.swayX * 0.5}px`,
                                '--ember-sway': `${e.swayX}px`,
                                animation: `ember-anim ${e.duration}s linear ${e.delay}s infinite`,
                                willChange: 'transform, opacity'
                            } as React.CSSProperties}
                        />
                    );
                })}
            </div>
        </div>
    );
});

// ─── Ultimate: Cosmic / Void Starfield ───────────────────────────────────────
const CosmicVoid = memo(() => {
    // Optimized for Mobile:
    // 1. Swapped motion.div top/left animations for pure CSS transform translateY (100% GPU accelerated).
    // 2. Removed CPU-intensive filter: blur(), replaced with natural soft radial gradients.
    // 3. Removed box-shadows, replaced with alpha-faded gradients.
    // 4. Balanced star count to 80 with CSS keyframes for buttery smooth 60FPS on iOS/Android.
    const stars = useMemo(() => Array.from({ length: 80 }).map((_, i) => {
        return {
            id: i,
            angle: Math.random() * 360,
            size: Math.random() * 1.5 + 1, // 1-2.5px
            duration: Math.random() * 2 + 1.2, // 1.2-3.2s
            delay: Math.random() * -4,
        };
    }), []);

    return (
        <div className="absolute inset-0 overflow-hidden bg-black pointer-events-none z-0">
            <style>{`
                @keyframes warp-star-anim {
                    0% { transform: rotate(var(--star-angle)) translateY(20px) scaleY(0.5); opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 0.8; }
                    100% { transform: rotate(var(--star-angle)) translateY(150vmax) scaleY(4); opacity: 0; }
                }
                @keyframes cosmic-nebula-rotate {
                    0% { transform: rotate(0deg) scale(0.9); }
                    50% { transform: rotate(180deg) scale(1.1); }
                    100% { transform: rotate(360deg) scale(0.9); }
                }
            `}</style>

            {/* Deep space color nebulae - REMOVED mix-blend-screen */}
            <div
                className="absolute -inset-[50%] opacity-50"
                style={{
                    background: 'radial-gradient(circle at 40% 50%, rgba(30,58,138,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(139,92,246,0.3) 0%, transparent 40%)',
                    animation: 'cosmic-nebula-rotate 60s linear infinite',
                    willChange: 'transform'
                }}
            />

            {/* Center black hole pull */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full z-10"
                style={{ background: 'radial-gradient(circle, rgba(0,0,0,1) 20%, rgba(0,0,0,0.8) 35%, transparent 60%)' }}
            />

            {/* Warping Stars */}
            <div className="absolute inset-0 z-20 origin-center">
                {stars.map((s) => (
                    <div
                        key={s.id}
                        className="absolute top-1/2 left-1/2 bg-white rounded-full"
                        style={{
                            width: s.size,
                            height: s.size * 6,
                            transformOrigin: 'top center',
                            '--star-angle': `${s.angle}deg`,
                            animation: `warp-star-anim ${s.duration}s cubic-bezier(0.4, 0, 0.2, 1) ${s.delay}s infinite`,
                            willChange: 'transform, opacity'
                        } as React.CSSProperties}
                    />
                ))}
            </div>

            {/* Front overlay to blend table */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.9)_100%)] z-30" />
        </div>
    );
});

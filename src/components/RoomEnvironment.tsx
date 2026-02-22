import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

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

// ─── High Stakes: Luxury Dust Sparkles ───────────────────────────────────────
const DustParticles = memo(() => {
    // Generate 30 floating dust particles
    const particles = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // %
        y: Math.random() * 100, // %
        size: Math.random() * 3 + 1, // 1-4px
        duration: Math.random() * 10 + 10, // 10-20s
        delay: Math.random() * -20 // random start phase
    })), []);

    return (
        <div className="absolute inset-0 mix-blend-screen opacity-60">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    style={{
                        width: p.size,
                        height: p.size,
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                    }}
                    animate={{
                        y: ['0%', '-30%', '0%'],
                        x: ['0%', '10%', '-10%', '0%'],
                        opacity: [0, 0.8, 0],
                        scale: [0.5, 1.5, 0.5]
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: "linear"
                    }}
                />
            ))}
        </div>
    );
});

// ─── Expert: Mystical Purple Aura ───────────────────────────────────────────
const MysticAura = memo(() => {
    return (
        <div className="absolute inset-0 mix-blend-screen opacity-50">
            {/* Spinning gradient orbs */}
            <motion.div
                className="absolute -top-[20%] -left-[20%] w-[70%] h-[70%] rounded-full bg-fuchsia-600 blur-[100px]"
                animate={{
                    x: ['0%', '20%', '0%', '-20%', '0%'],
                    y: ['0%', '10%', '20%', '10%', '0%'],
                    scale: [1, 1.2, 0.9, 1.1, 1]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
                className="absolute -bottom-[20%] -right-[20%] w-[80%] h-[80%] rounded-full bg-purple-600 blur-[120px]"
                animate={{
                    x: ['0%', '-30%', '0%', '20%', '0%'],
                    y: ['0%', '-20%', '10%', '-10%', '0%'],
                    scale: [1, 1.1, 1.3, 0.9, 1]
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
                className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full bg-amber-500 blur-[100px] opacity-40"
                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
});

// ─── Legendary: Fire Embers ──────────────────────────────────────────────────
const FireEmbers = memo(() => {
    // Generate 50 ascending embers
    const embers = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // %
        size: Math.random() * 4 + 2, // 2-6px
        duration: Math.random() * 5 + 4, // 4-9s
        delay: Math.random() * -10,
        sway: Math.random() * 40 - 20 // -20 to 20 wide
    })), []);

    return (
        <div className="absolute inset-0 mix-blend-screen overflow-hidden">
            {/* Dark vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10" />

            {/* Embers */}
            <div className="absolute inset-0 z-20">
                {embers.map(e => (
                    <motion.div
                        key={e.id}
                        className="absolute bottom-0 rounded-full"
                        style={{
                            width: e.size,
                            height: e.size,
                            left: `${e.x}%`,
                            background: Math.random() > 0.5 ? '#f59e0b' : '#ef4444',
                            boxShadow: `0 0 ${e.size * 2}px ${Math.random() > 0.5 ? '#f59e0b' : '#ef4444'}`,
                        }}
                        initial={{ y: '100px', opacity: 0, x: 0 }}
                        animate={{
                            y: ['100px', '-120vh'],
                            opacity: [0, 1, 1, 0],
                            x: [0, e.sway, -e.sway, e.sway],
                            scale: [1, 1.5, 0.5]
                        }}
                        transition={{
                            duration: e.duration,
                            repeat: Infinity,
                            delay: e.delay,
                            ease: "linear",
                            times: [0, 0.2, 0.8, 1]
                        }}
                    />
                ))}
            </div>

            {/* Heat glow from bottom */}
            <div className="absolute -bottom-32 left-0 w-full h-64 bg-red-600 blur-[80px] opacity-30 z-0" />
        </div>
    );
});

// ─── Ultimate: Cosmic / Void Starfield ───────────────────────────────────────
const CosmicVoid = memo(() => {
    // Generate stars for hyperdrive/warp effect
    const stars = useMemo(() => Array.from({ length: 150 }).map((_, i) => {
        // distribute from center
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 100;
        return {
            id: i,
            angle,
            radius,
            size: Math.random() * 2 + 1,
            duration: Math.random() * 3 + 1, // 1-4s (fast warp)
            delay: Math.random() * -4,
        };
    }), []);

    return (
        <div className="absolute inset-0 overflow-hidden bg-black">
            {/* Deep space color nebulae */}
            <motion.div
                className="absolute inset-0 opacity-40 mix-blend-screen"
                style={{
                    background: 'radial-gradient(circle at 40% 50%, rgba(30,58,138,0.8), transparent 50%), radial-gradient(circle at 70% 30%, rgba(139,92,246,0.6), transparent 40%)',
                    filter: 'blur(40px)'
                }}
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            />

            {/* Center black hole pull */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-black shadow-[0_0_100px_rgba(0,0,0,1)] z-10" />

            {/* Warping Stars */}
            <div className="absolute inset-0 z-20 origin-center">
                {stars.map((s) => {
                    const startX = 50 + Math.cos(s.angle) * 5;
                    const startY = 50 + Math.sin(s.angle) * 5;
                    const endX = 50 + Math.cos(s.angle) * (s.radius + 150);
                    const endY = 50 + Math.sin(s.angle) * (s.radius + 150);

                    return (
                        <motion.div
                            key={s.id}
                            className="absolute rounded-full bg-white"
                            style={{
                                width: s.size,
                                height: s.size * 6,
                                transformOrigin: 'center',
                                // Align line with movement vector
                                transform: `rotate(${s.angle + Math.PI / 2}rad)`
                            }}
                            initial={{ left: `${startX}%`, top: `${startY}%`, opacity: 0, scale: 0 }}
                            animate={{
                                left: [`${startX}%`, `${endX}%`],
                                top: [`${startY}%`, `${endY}%`],
                                opacity: [0, 1, 0],
                                scale: [0.1, 2, 4]
                            }}
                            transition={{
                                duration: s.duration,
                                repeat: Infinity,
                                delay: s.delay,
                                ease: "easeIn"
                            }}
                        />
                    );
                })}
            </div>

            {/* Front overlay to blend table */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.9)_100%)] z-30" />
        </div>
    );
});

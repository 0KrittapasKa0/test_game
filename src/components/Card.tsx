import { motion } from 'framer-motion';
import type { Card as CardType } from '../types/game';

interface CardProps {
    card: CardType;
    faceDown?: boolean;
    delay?: number;
    small?: boolean;
    category?: 'STANDARD' | 'HIGH_STAKES' | 'EXPERT' | 'LEGENDARY' | 'ULTIMATE';
}

function isRed(suit: string): boolean {
    return suit === '♥' || suit === '♦';
}

export default function Card({ card, faceDown = false, delay = 0, small = false, category = 'STANDARD' }: CardProps) {
    const color = isRed(card.suit) ? '#dc2626' : '#1e293b';
    const w = small ? 'w-[46px] h-[66px]' : 'w-[70px] h-[98px] sm:w-[82px] sm:h-[115px]';
    const textBase = small ? 'text-[11px]' : 'text-sm sm:text-base';
    const textCenter = small ? 'text-lg' : 'text-2xl sm:text-3xl';

    // Different deal animations based on room tier
    const isUltimate = category === 'ULTIMATE';
    const isLegendary = category === 'LEGENDARY';

    // WRAPPER ANIMATION (Position, Scale, Opacity, and Glow)
    let wrapperInitial: any = { scale: 0.6, opacity: 0, y: -50 };
    if (isUltimate) {
        wrapperInitial = { scale: 3, opacity: 0, y: -200, rotateZ: 45 };
    } else if (isLegendary) {
        wrapperInitial = { scale: 0.2, opacity: 0, y: 100 };
    }

    let wrapperAnimate: any = { scale: 1, opacity: 1, y: 0, rotateZ: 0 };

    // For ultimate, add a light glow during animate
    if (isUltimate && !faceDown) {
        wrapperAnimate = { ...wrapperAnimate, boxShadow: ['0 0 0px rgba(0,0,0,0)', '0 0 50px rgba(253,224,71,0.8)', '0 2px 8px rgba(0,0,0,0.4)'] };
    } else {
        wrapperAnimate = { ...wrapperAnimate, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' };
    }

    // INNER ANIMATION (3D Rotation Only)
    // Always start rotated 180 (face down), then flip based on faceDown prop
    const innerInitial = { rotateY: 180 };
    const innerAnimate = { rotateY: faceDown ? 180 : 0 };

    const transitionProps: any = isUltimate
        ? { duration: 0.6, delay, type: 'spring', bounce: 0.5 }
        : { duration: 0.45, delay, type: 'spring', stiffness: 220, damping: 20 };

    return (
        <motion.div
            className={`${w} relative select-none drop-shadow-xl`}
            initial={wrapperInitial}
            animate={wrapperAnimate}
            transition={transitionProps}
            style={{ perspective: 1000 }} // Perspective defines the depth for the inner 3D space
        >
            {/* INNER 3D CONTAINER */}
            <motion.div
                className="w-full h-full relative"
                initial={innerInitial}
                animate={innerAnimate}
                transition={transitionProps}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front Face */}
                <div
                    className="absolute inset-0 rounded-lg flex flex-col justify-between overflow-hidden"
                    style={{
                        backfaceVisibility: 'hidden',
                        background: 'linear-gradient(160deg, #ffffff 0%, #f8f8f8 50%, #f0f0f0 100%)',
                        border: '1px solid #d4d4d4',
                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)', // Subtle inner shadow
                    }}
                >
                    {/* Subtle shine overlay */}
                    <div className="absolute inset-0 pointer-events-none rounded-lg"
                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.02) 100%)' }}
                    />

                    {/* Top-left corner */}
                    <div className="flex flex-col items-start leading-none pl-1.5 pt-1 relative z-10">
                        <span className={`${textBase} font-extrabold`} style={{ color }}>{card.rank}</span>
                        <span className={`${small ? 'text-[10px]' : 'text-xs sm:text-sm'} -mt-0.5`} style={{ color }}>{card.suit}</span>
                    </div>

                    {/* Center suit */}
                    <div className="flex items-center justify-center -mt-1 -mb-1 relative z-10">
                        <span className={`${textCenter} drop-shadow-sm`} style={{ color }}>{card.suit}</span>
                    </div>

                    {/* Bottom-right corner (inverted) */}
                    <div className="flex flex-col items-end leading-none pr-1.5 pb-1 rotate-180 relative z-10">
                        <span className={`${textBase} font-extrabold`} style={{ color }}>{card.rank}</span>
                        <span className={`${small ? 'text-[10px]' : 'text-xs sm:text-sm'} -mt-0.5`} style={{ color }}>{card.suit}</span>
                    </div>
                </div>

                {/* Back Face */}
                <div
                    className="absolute inset-0 rounded-lg"
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(145deg, #1e3f6e 0%, #2a5490 40%, #1e3f6e 100%)',
                        border: '1px solid rgba(80,130,200,0.3)',
                    }}
                >
                    <div className="w-full h-full flex items-center justify-center p-1.5">
                        <div
                            className="w-full h-full rounded-sm border border-white/15"
                            style={{
                                background: `
                                    repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 4px),
                                    repeating-linear-gradient(-45deg, transparent 0px, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 4px)
                                `,
                            }}
                        >
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="text-white/10 text-xs">♠</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

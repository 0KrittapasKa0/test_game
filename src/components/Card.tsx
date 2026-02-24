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
            style={{ perspective: 1000, WebkitPerspective: 1000, willChange: 'transform, opacity' }} // Perspective defines the depth for the inner 3D space
        >
            {/* INNER 3D CONTAINER */}
            <motion.div
                className="w-full h-full relative"
                initial={innerInitial}
                animate={innerAnimate}
                transition={transitionProps}
                style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d' as any, willChange: 'transform' }}
            >
                {/* Front Face */}
                <div
                    className="absolute inset-0 rounded-lg bg-white"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg) translateZ(1px)',
                        WebkitTransform: 'rotateY(0deg) translateZ(1px)',
                        border: '1px solid #e5e7eb', // subtle border
                    }}
                >
                    {/* Top-left corner */}
                    <div className={`absolute ${small ? 'top-1 left-1' : 'top-1.5 left-1.5'} flex flex-col items-center leading-none z-10 w-[20px] sm:w-[24px]`}>
                        <span className={`${textBase} font-extrabold text-center`} style={{ color }}>{card.rank}</span>
                        <span className={`${small ? 'text-[11px]' : 'text-sm sm:text-lg'} -mt-0.5 font-sans`} style={{ color }}>{card.suit + '\uFE0E'}</span>
                    </div>

                    {/* Center suit */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <span className={`${textCenter} drop-shadow-none font-sans`} style={{ color }}>{card.suit + '\uFE0E'}</span>
                    </div>

                    {/* Bottom-right corner (inverted) */}
                    <div className={`absolute ${small ? 'bottom-1 right-1' : 'bottom-1.5 right-1.5'} flex flex-col items-center leading-none rotate-180 z-10 w-[20px] sm:w-[24px]`}>
                        <span className={`${textBase} font-extrabold text-center`} style={{ color }}>{card.rank}</span>
                        <span className={`${small ? 'text-[11px]' : 'text-sm sm:text-lg'} -mt-0.5 font-sans`} style={{ color }}>{card.suit + '\uFE0E'}</span>
                    </div>
                </div>

                {/* Back Face */}
                <div
                    className="absolute inset-0 rounded-lg bg-white"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg) translateZ(1px)',
                        WebkitTransform: 'rotateY(180deg) translateZ(1px)',
                        border: '1px solid #e5e7eb', // matches front
                    }}
                >
                    <div className="w-full h-full p-[5px] sm:p-[6px]">
                        <div className="w-full h-full rounded-[6px] border-[1.5px] border-[#e5e7eb] flex items-center justify-center">
                            <span className="text-[#e5e7eb] text-xl sm:text-2xl drop-shadow-none leading-none font-sans">
                                {'♠\uFE0E'}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

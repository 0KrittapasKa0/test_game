import { motion } from 'framer-motion';
import type { Card as CardType } from '../types/game';

interface CardProps {
    card: CardType;
    faceDown?: boolean;
    delay?: number;
    small?: boolean;
}

function isRed(suit: string): boolean {
    return suit === '♥' || suit === '♦';
}

export default function Card({ card, faceDown = false, delay = 0, small = false }: CardProps) {
    const color = isRed(card.suit) ? '#dc2626' : '#1e293b';
    const w = small ? 'w-[46px] h-[66px]' : 'w-[70px] h-[98px] sm:w-[82px] sm:h-[115px]';
    const textBase = small ? 'text-[11px]' : 'text-sm sm:text-base';
    const textCenter = small ? 'text-lg' : 'text-2xl sm:text-3xl';

    return (
        <motion.div
            className={`${w} relative select-none`}
            initial={{ rotateY: 180, scale: 0.6, opacity: 0 }}
            animate={{ rotateY: faceDown ? 180 : 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay, type: 'spring', stiffness: 220, damping: 20 }}
            style={{ perspective: 600, transformStyle: 'preserve-3d' }}
        >
            {/* Front */}
            <motion.div
                className="absolute inset-0 rounded-lg flex flex-col justify-between overflow-hidden"
                style={{
                    backfaceVisibility: 'hidden',
                    background: 'linear-gradient(160deg, #ffffff 0%, #f8f8f8 50%, #f0f0f0 100%)',
                    border: '1px solid #d4d4d4',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
                }}
                animate={{ opacity: faceDown ? 0 : 1 }}
                transition={{ duration: 0.2 }}
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
            </motion.div>

            {/* Back */}
            <motion.div
                className="absolute inset-0 rounded-lg"
                style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: 'linear-gradient(145deg, #1e3f6e 0%, #2a5490 40%, #1e3f6e 100%)',
                    border: '1px solid rgba(80,130,200,0.3)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)',
                }}
                animate={{ opacity: faceDown ? 1 : 0 }}
                transition={{ duration: 0.2 }}
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
            </motion.div>
        </motion.div>
    );
}

import { memo, type CSSProperties } from 'react';
import { motion, type Transition } from 'framer-motion';
import type { Card as CardType, Suit } from '../types/game';

interface CardProps {
    card: CardType;
    faceDown?: boolean;
    delay?: number;
    small?: boolean;
}

const suitFiles: Record<Suit, string> = {
    '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs',
};
const faceStyle: CSSProperties = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

function Card({ card, faceDown = false, delay = 0, small = false }: CardProps) {
    const size = small ? 'w-[46px] h-[66px]' : 'w-[70px] h-[98px] sm:w-[82px] sm:h-[115px]';
    const transition: Transition = { duration: 0.45, delay, type: 'spring', stiffness: 220, damping: 20 };
    const imageClass = 'absolute inset-0 w-full h-full rounded-lg';
    const base = `${import.meta.env.BASE_URL}cards/`;

    return (
        <motion.div
            className={`${size} relative select-none`}
            role="img"
            aria-label={faceDown ? 'ไพ่คว่ำ' : `${card.rank}${card.suit}`}
            initial={{ scale: 0.6, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotateZ: 0 }}
            transition={transition}
            style={{ perspective: 1000, WebkitPerspective: 1000, willChange: 'transform, opacity' }}
        >
            <motion.div
                className="w-full h-full relative"
                initial={{ rotateY: 180 }}
                animate={{ rotateY: faceDown ? 180 : 0 }}
                transition={transition}
                style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d', willChange: 'transform' }}
            >
                <img
                    className={imageClass}
                    src={`${base}${suitFiles[card.suit]}-${card.rank}.png`}
                    alt=""
                    draggable={false}
                    width={164}
                    height={230}
                    style={{ ...faceStyle, transform: 'rotateY(0deg) translateZ(1px)' }}
                />
                <img
                    className={imageClass}
                    src={`${base}back.png`}
                    alt=""
                    draggable={false}
                    width={164}
                    height={230}
                    style={{ ...faceStyle, transform: 'rotateY(180deg) translateZ(1px)' }}
                />
            </motion.div>
        </motion.div>
    );
}

export default memo(Card);

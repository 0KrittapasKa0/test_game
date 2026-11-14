import { memo, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { motion, useAnimationControls, useReducedMotion, type Transition } from 'framer-motion';
import { CARD_FLIGHT_SECONDS } from '../utils/dealAnimation';
import type { Card as CardType, Suit } from '../types/game';

interface CardProps {
    card: CardType;
    faceDown?: boolean;
    delay?: number;
    small?: boolean;
    dealFromDeck?: boolean;
}

const suitFiles: Record<Suit, string> = {
    '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs',
};
const faceStyle: CSSProperties = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

function Card({ card, faceDown = false, delay = 0, small = false, dealFromDeck = false }: CardProps) {
    const elementRef = useRef<HTMLDivElement>(null);
    const controls = useAnimationControls();
    const reducedMotion = useReducedMotion();
    // Capture the mount event: subsequent reveals must not replay the flight.
    const entry = useRef({ dealFromDeck, delay, reducedMotion });
    useLayoutEffect(() => {
        const element = elementRef.current;
        if (!element) return;
        controls.set({ x: 0, y: 0, rotate: 0, scale: 1, opacity: 0 });
        const origin = element.closest('[data-card-table]')?.querySelector('[data-deck-origin]');
        if (entry.current.dealFromDeck && origin && !entry.current.reducedMotion) {
            const destination = element.getBoundingClientRect();
            const source = origin.getBoundingClientRect();
            // Hands can be inside scaled seat panels: convert viewport pixels to local units.
            const parentScale = destination.width / element.offsetWidth || 1;
            const x = (source.left + source.width / 2 - destination.left - destination.width / 2) / parentScale;
            const y = (source.top + source.height / 2 - destination.top - destination.height / 2) / parentScale;
            const rotation = x > 0 ? -24 : 24;
            controls.set({ x, y, rotate: rotation, scale: 1, opacity: 1 });
            void controls.start({
                x: [x, x * 0.48, 0],
                y: [y, y * 0.48 - 28, 0],
                rotate: [rotation, rotation * 0.3, 0],
                scale: [1, 1.08, 1],
                opacity: 1,
                transition: { duration: CARD_FLIGHT_SECONDS, times: [0, 0.5, 1], ease: [0.22, 0.61, 0.36, 1] },
            });
        } else {
            controls.set({ x: 0, y: entry.current.reducedMotion ? 0 : -18, scale: 1, opacity: 0 });
            void controls.start({ y: 0, opacity: 1, transition: { duration: 0.2, delay: entry.current.delay } });
        }
        return () => controls.stop();
    }, [controls]);
    const size = small ? 'w-[46px] h-[66px]' : 'w-[70px] h-[98px] sm:w-[82px] sm:h-[115px]';
    const transition: Transition = { duration: 0.45, delay, type: 'spring', stiffness: 220, damping: 20 };
    const imageClass = 'absolute inset-0 w-full h-full rounded-lg';
    const base = `${import.meta.env.BASE_URL}cards/`;

    return (
        <motion.div
            ref={elementRef}
            className={`${size} relative select-none`}
            role="img"
            aria-label={faceDown ? 'ไพ่คว่ำ' : `${card.rank}${card.suit}`}
            initial={{ opacity: 0 }}
            animate={controls}
            style={{ perspective: 1000, WebkitPerspective: 1000, willChange: 'transform, opacity' }}
        >
            <motion.div
                className="w-full h-full relative"
                initial={{ rotateY: 180 }}
                animate={{ rotateY: faceDown ? 180 : 0 }}
                transition={{ ...transition, delay: dealFromDeck && !reducedMotion ? CARD_FLIGHT_SECONDS - 0.08 : delay }}
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

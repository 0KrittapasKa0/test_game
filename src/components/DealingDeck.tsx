import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import './DealingDeck.css';

/** Uses the same card-back texture as the hands; animation restarts each round. */
export default function DealingDeck({ dealing }: { dealing: boolean }) {
    const reducedMotion = useReducedMotion();

    return (
        <AnimatePresence>
            {dealing && (
                <motion.div
                    className="dealing-deck"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.25 }}
                    role="status"
                    aria-label="กำลังสับและแจกไพ่"
                >
                    <div className="dealing-deck__halo" />
                    <div className="dealing-deck__shadow" />
                    <div className="dealing-deck__stack" data-deck-origin>
                        {Array.from({ length: 9 }, (_, index) => (
                            <motion.div
                                key={index}
                                className="dealing-deck__card"
                                initial={{ x: 0, y: -index * 0.7, rotate: 0 }}
                                animate={reducedMotion ? { y: -index * 0.7 } : {
                                    x: [0, index % 2 ? -36 : 36, index % 2 ? -42 : 42, (index - 4) * 9, 0, 0],
                                    y: [-index * 0.7, -index * 2 - 8, -index * 1.5 - 12, -Math.abs(index - 4) * 2 - 8, -index * 0.7 - 3, -index * 0.7],
                                    rotate: [0, index % 2 ? -16 : 16, index % 2 ? -12 : 12, (index - 4) * 7, 0, 0],
                                }}
                                transition={{ duration: 1.2, times: [0, 0.25, 0.43, 0.67, 0.9, 1], ease: 'easeInOut' }}
                                style={{ zIndex: index }}
                            >
                                <img src={`${import.meta.env.BASE_URL}cards/back.png`} alt="" draggable={false} />
                                <div className="dealing-deck__sheen" />
                            </motion.div>
                        ))}
                    </div>
                    <span className="dealing-deck__caption">กำลังแจกไพ่</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

import { motion } from 'framer-motion';
import { ChipBagIcon } from './ChipBagIcon';

interface DailyRewardIconProps {
    dayIndex: number; // 0-6
    size?: number;
    isActive?: boolean;
}

export function DailyRewardIcon({ dayIndex, size = 48, isActive = false }: DailyRewardIconProps) {
    const isDay7 = dayIndex === 6;

    return (
        <motion.div
            animate={isActive ? { scale: [1, 1.08, 1] } : {}}
            transition={isActive ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
            className="flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            <ChipBagIcon
                isBig={isDay7}
                className={isDay7 ? "w-full h-full drop-shadow-xl" : "w-[90%] h-[90%] drop-shadow-md"}
            />
        </motion.div>
    );
}

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { formatChips } from '../utils/formatChips';
import { getChipStyle, type ChipColorStyle } from '../utils/chipColors';

interface ChipStackProps {
    amount: number;
    delay?: number;
    chipPresets?: number[];
    category?: string;
}

export default function ChipStack({ amount, delay = 0, chipPresets, category = 'STANDARD' }: ChipStackProps) {
    // Use room presets as denominations, or fallback to standard set
    const denominations = useMemo(() => {
        if (chipPresets && chipPresets.length > 0) {
            return [...chipPresets].sort((a, b) => b - a); // Sort descending
        }
        // Fallback denominations
        return [1000, 500, 100, 50, 20, 10, 5, 1];
    }, [chipPresets]);

    // Build the sorted presets for color position lookup
    const sortedPresets = useMemo(() => {
        if (chipPresets && chipPresets.length > 0) {
            return [...chipPresets].sort((a, b) => a - b);
        }
        return [1, 5, 10, 20, 50, 100, 500, 1000];
    }, [chipPresets]);

    // Memoize chip generation to prevent re-randomization on re-renders
    const chips = useMemo(() => {
        const result: { value: number; style: ChipColorStyle; index: number; rotation: number }[] = [];
        let remaining = amount;
        let count = 0;

        for (const denom of denominations) {
            const num = Math.floor(remaining / denom);
            if (num > 0) {
                // Find position in sorted presets for color
                const position = sortedPresets.indexOf(denom);
                const chipPosition = position !== -1 ? position : 0;
                const style = getChipStyle(chipPosition, category);

                for (let i = 0; i < num; i++) {
                    if (count < 15) {
                        result.push({
                            value: denom,
                            style,
                            index: count,
                            rotation: Math.random() * 60 - 30,
                        });
                    }
                    count++;
                }
                remaining %= denom;
            }
        }
        return result.reverse();
    }, [amount, denominations, sortedPresets, category]);

    return (
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 pointer-events-none">
            {chips.map((chip, i) => (
                <motion.div
                    key={`${chip.value}-${i}`}
                    className={`absolute inset-0 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)] flex items-center justify-center
                        bg-gradient-to-br ${chip.style.fromTo} border border-white/10`}
                    style={{
                        zIndex: i,
                        y: -i * 4,
                    }}
                    initial={{ y: -100, opacity: 0, rotate: Math.random() * 360 }}
                    animate={{ y: -i * 4, opacity: 1, rotate: chip.rotation }}
                    transition={{ delay: delay + i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                >
                    {/* Dashed Stripe Pattern (Outer Ring) */}
                    <div className="absolute inset-0 rounded-full border-[4px] border-dashed border-white/40 opacity-80" />

                    {/* Inner Circle (Solid) */}
                    <div className={`absolute w-[65%] h-[65%] rounded-full border border-white/30 shadow-inner ${chip.style.border} bg-white/10 backdrop-brightness-110 flex items-center justify-center`}>
                        <div className="w-[80%] h-[80%] rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                            <span className={`text-[6px] sm:text-[8px] font-bold ${chip.style.textColor} drop-shadow-sm`}>
                                {formatChips(chip.value)}
                            </span>
                        </div>
                    </div>

                    {/* Side Edge Effect (Simulated 3D thickness) */}
                    <div className="absolute inset-0 rounded-full border-b-[2px] border-black/30 pointer-events-none" />
                </motion.div>
            ))}

            {/* Total Value Label (Floating) */}
            <motion.div
                className="absolute -bottom-5 w-full flex justify-center z-50 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <span className="bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-white font-bold shadow-sm border border-white/10">
                    {formatChips(amount)}
                </span>
            </motion.div>
        </div>
    );
}

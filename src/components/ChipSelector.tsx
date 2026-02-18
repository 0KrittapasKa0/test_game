import { motion } from 'framer-motion';
import { SFX } from '../utils/sound';
import { formatChips } from '../utils/formatChips';
import { getChipStyle } from '../utils/chipColors';

interface ChipSelectorProps {
    maxBet: number;
    currentBet: number;
    lastBet?: number;
    chipPresets: number[];
    category: string;
    onSelect: (amount: number) => void;
    onConfirm: () => void;
    disabled?: boolean;
}

export default function ChipSelector({ maxBet, currentBet, lastBet, chipPresets, category, onSelect, onConfirm, disabled = false }: ChipSelectorProps) {
    const handleAddChip = (amount: number) => {
        const newTotal = currentBet + amount;
        if (newTotal <= maxBet) {
            SFX.chipStack();
            onSelect(newTotal);
        }
    };

    const handleClear = () => {
        SFX.click();
        onSelect(0);
    };

    // Sort presets ascending for position-based coloring
    const sortedPresets = [...chipPresets].sort((a, b) => a - b);

    return (
        <motion.div
            className="glass p-4 sm:p-5 w-full max-w-md mx-auto flex flex-col items-center"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        >
            <div className="flex items-center justify-between w-full mb-3 px-2">
                <p className="text-yellow-400/80 text-sm font-medium">💰 วางเดิมพัน (ผสมชิปได้)</p>
                {currentBet > 0 && (
                    <button
                        onClick={handleClear}
                        className="text-xs text-red-400 hover:text-red-300 underline"
                    >
                        ล้างค่า
                    </button>
                )}
            </div>

            <div className="flex justify-center flex-wrap gap-4 mb-4">
                {chipPresets.map((amount) => {
                    const position = sortedPresets.indexOf(amount);
                    const style = getChipStyle(position, category);
                    const canAdd = currentBet + amount <= maxBet;

                    return (
                        <motion.button
                            key={amount}
                            whileTap={canAdd ? { scale: 0.85, rotate: 10 } : {}}
                            disabled={!canAdd}
                            onClick={() => handleAddChip(amount)}
                            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-lg flex items-center justify-center
                                bg-gradient-to-br ${style.fromTo} border border-white/10 ${style.border}
                                ${!canAdd ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:brightness-110 cursor-pointer hover:-translate-y-1'}`}
                        >
                            {/* Chip Stripes */}
                            <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-white/40 opacity-80" />

                            {/* Inner Circle */}
                            <div className="absolute w-[68%] h-[68%] rounded-full border border-white/20 bg-black/10 flex items-center justify-center shadow-inner">
                                <div className="w-[85%] h-[85%] rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                                    <span className={`${style.textColor} font-bold text-sm sm:text-base drop-shadow-md z-10`}>
                                        {formatChips(amount)}
                                    </span>
                                </div>
                            </div>

                            {/* 3D Edge */}
                            <div className="absolute inset-0 rounded-full border-b-[3px] border-black/30 pointer-events-none" />
                        </motion.button>
                    );
                })}
            </div>

            {/* Repeat Bet Button */}
            {lastBet && lastBet > 0 && lastBet <= maxBet && currentBet === 0 && (
                <div className="flex justify-center mb-4">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect(lastBet)}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-yellow-300/80 flex items-center gap-1 active:scale-95 transition"
                    >
                        ↺ เดิมพันซ้ำ ({formatChips(lastBet)})
                    </motion.button>
                </div>
            )}

            {/* Total Display & Confirm */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center w-full bg-black/20 rounded-xl p-3 border border-white/5"
            >
                <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 text-xs">ยอดรวม</span>
                    <div>
                        <span className="text-yellow-300 font-bold text-2xl">{formatChips(currentBet)}</span>
                        <span className="text-xs text-gray-500 ml-1">/{formatChips(maxBet)}</span>
                    </div>
                </div>

                <motion.button
                    whileHover={!disabled && currentBet > 0 ? { scale: 1.02 } : {}}
                    whileTap={!disabled && currentBet > 0 ? { scale: 0.98 } : {}}
                    onClick={!disabled ? onConfirm : undefined}
                    disabled={currentBet === 0 || disabled}
                    className={`w-full py-3 rounded-lg font-bold text-lg shadow-lg border-b-4 transition-all
                        ${disabled
                            ? 'bg-gray-600 text-gray-300 border-gray-700 cursor-wait animate-pulse'
                            : currentBet > 0
                                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black border-amber-700'
                                : 'bg-gray-700 text-gray-400 border-gray-800 cursor-not-allowed'}`}
                >
                    {disabled ? '⏳ รอผู้เล่นอื่น วางเดิมพัน...' : currentBet > 0 ? '✅ ยืนยันเดิมพัน' : 'กรุณาเลือกชิป'}
                </motion.button>
            </motion.div>
        </motion.div>
    );
}

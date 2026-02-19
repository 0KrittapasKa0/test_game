import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SFX } from '../utils/sound';
import { formatChips } from '../utils/formatChips';
import { getChipStyle } from '../utils/chipColors';

interface ChipSelectorProps {
    maxBet: number;       // room maxBet (capped at chips) — for normal chip buttons
    totalChips: number;   // total chips available — for raise slider
    currentBet: number;
    lastBet?: number;
    chipPresets: number[];
    category: string;
    onSelect: (amount: number) => void;
    onConfirm: () => void;
    disabled?: boolean;
}

export default function ChipSelector({
    maxBet, totalChips, currentBet, lastBet, chipPresets, category,
    onSelect, onConfirm, disabled = false,
}: ChipSelectorProps) {
    const [showRaise, setShowRaise] = useState(false);
    const [raiseAmount, setRaiseAmount] = useState(0);
    const lastSliderTickRef = useRef(0);

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

    const handleOpenRaise = () => {
        SFX.click();
        // Start slider at current bet or minBet equivalent
        setRaiseAmount(Math.max(currentBet, maxBet > 0 ? maxBet : 0));
        setShowRaise(true);
    };

    const handleConfirmRaise = () => {
        if (raiseAmount === totalChips) {
            SFX.allIn();
        } else {
            SFX.betConfirm();
        }
        onSelect(raiseAmount);
        setShowRaise(false);
    };

    const handleCancelRaise = () => {
        SFX.click();
        setShowRaise(false);
    };

    // Percentage quick picks
    const pct25 = Math.floor(totalChips * 0.25);
    const pct50 = Math.floor(totalChips * 0.50);
    const pct75 = Math.floor(totalChips * 0.75);
    const allIn = totalChips;

    const sortedPresets = [...chipPresets].sort((a, b) => a - b);

    // ── หลังยืนยันแล้ว: แสดงแค่ปุ่มรอ ──
    if (disabled) {
        return (
            <motion.div
                className="glass p-4 sm:p-5 w-full max-w-md mx-auto flex flex-col items-center"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            >
                <motion.button
                    disabled
                    className="w-full py-3 rounded-lg font-bold text-lg shadow-lg border-b-4 bg-gray-600 text-gray-300 border-gray-700 cursor-wait animate-pulse"
                >
                    ⏳ รอผู้เล่นอื่น วางเดิมพัน...
                </motion.button>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="glass p-4 sm:p-5 w-full max-w-md mx-auto flex flex-col items-center"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        >
            <AnimatePresence mode="wait">
                {showRaise ? (
                    /* ═══════ Raise Panel ═══════ */
                    <motion.div
                        key="raise"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full"
                    >
                        <div className="flex items-center justify-between w-full mb-3 px-1">
                            <p className="text-red-400 text-sm font-bold">🔥 เกทับ</p>
                            <button
                                onClick={handleCancelRaise}
                                className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
                            >
                                ← ยกเลิก
                            </button>
                        </div>

                        {/* Amount Display */}
                        <div className="text-center mb-4">
                            <span className="text-yellow-300 font-bold text-3xl">
                                {formatChips(raiseAmount)}
                            </span>
                            <span className="text-gray-500 text-sm ml-1">
                                / {formatChips(totalChips)}
                            </span>
                        </div>

                        {/* Slider */}
                        <div className="w-full px-2 mb-4">
                            <input
                                type="range"
                                min={0}
                                max={totalChips}
                                step={Math.max(1, Math.floor(totalChips / 200))}
                                value={raiseAmount}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setRaiseAmount(val);
                                    // Throttled slider tick sound (~80ms)
                                    const now = Date.now();
                                    if (now - lastSliderTickRef.current > 80) {
                                        SFX.sliderTick();
                                        lastSliderTickRef.current = now;
                                    }
                                }}
                                className="w-full h-3 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #f59e0b ${(raiseAmount / totalChips) * 100}%, rgba(255,255,255,0.1) ${(raiseAmount / totalChips) * 100}%)`,
                                }}
                            />
                        </div>

                        {/* Quick Pick Buttons */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {[
                                { label: '25%', value: pct25 },
                                { label: '50%', value: pct50 },
                                { label: '75%', value: pct75 },
                                { label: 'All-in', value: allIn },
                            ].map(({ label, value }) => (
                                <motion.button
                                    key={label}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => { SFX.click(); setRaiseAmount(value); }}
                                    className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border
                                        ${raiseAmount === value
                                            ? label === 'All-in'
                                                ? 'bg-gradient-to-b from-red-500 to-red-700 text-white border-red-800 shadow-lg shadow-red-500/30'
                                                : 'bg-gradient-to-b from-yellow-400 to-amber-500 text-black border-amber-600 shadow-lg shadow-amber-500/20'
                                            : label === 'All-in'
                                                ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    <div>{label}</div>
                                    <div className={`text-[10px] mt-0.5 ${raiseAmount === value ? (label === 'All-in' ? 'text-white/70' : 'text-black/50') : 'text-gray-500'}`}>
                                        {formatChips(value)}
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Confirm Raise */}
                        <motion.button
                            whileHover={raiseAmount > 0 ? { scale: 1.02 } : {}}
                            whileTap={raiseAmount > 0 ? { scale: 0.98 } : {}}
                            onClick={handleConfirmRaise}
                            disabled={raiseAmount <= 0}
                            className={`w-full py-3 rounded-lg font-bold text-lg shadow-lg border-b-4 transition-all cursor-pointer
                                ${raiseAmount > 0
                                    ? raiseAmount === allIn
                                        ? 'bg-gray-950 text-amber-400 border-amber-600 shadow-amber-500/20 ring-2 ring-amber-500/40'
                                        : 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black border-amber-700'
                                    : 'bg-gray-700 text-gray-400 border-gray-800 cursor-not-allowed'}`}
                        >
                            {raiseAmount === allIn ? '💥 All-in!' : `🔥 เกทับ ${formatChips(raiseAmount)}`}
                        </motion.button>
                    </motion.div>
                ) : (
                    /* ═══════ Normal Chip Select ═══════ */
                    <motion.div
                        key="chips"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full flex flex-col items-center"
                    >
                        <div className="flex items-center justify-between w-full mb-3 px-2">
                            <p className="text-yellow-400/80 text-sm font-medium">💰 วางเดิมพัน (ผสมชิปได้)</p>
                            {currentBet > 0 && (
                                <button
                                    onClick={handleClear}
                                    className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
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
                                        <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-white/40 opacity-80" />
                                        <div className="absolute w-[68%] h-[68%] rounded-full border border-white/20 bg-black/10 flex items-center justify-center shadow-inner">
                                            <div className="w-[85%] h-[85%] rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                                                <span className={`${style.textColor} font-bold text-sm sm:text-base drop-shadow-md z-10`}>
                                                    {formatChips(amount)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 rounded-full border-b-[3px] border-black/30 pointer-events-none" />
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Repeat Bet Button */}
                        {lastBet && lastBet > 0 && lastBet <= totalChips && currentBet === 0 && (
                            <div className="flex justify-center mb-4">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { SFX.repeatBet(); onSelect(lastBet); }}
                                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-yellow-300/80 flex items-center gap-1 active:scale-95 transition cursor-pointer"
                                >
                                    ↺ เดิมพันซ้ำ ({formatChips(lastBet)})
                                </motion.button>
                            </div>
                        )}

                        {/* Total Display & Confirm + Raise */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center w-full bg-black/20 rounded-xl p-3 border border-white/5"
                        >
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-gray-400 text-xs">ยอดรวม</span>
                                <div>
                                    <span className="text-yellow-300 font-bold text-2xl">{formatChips(currentBet)}</span>
                                    <span className="text-xs text-gray-500 ml-1">/{formatChips(totalChips)}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {/* Confirm Button */}
                                <motion.button
                                    whileHover={currentBet > 0 ? { scale: 1.02 } : {}}
                                    whileTap={currentBet > 0 ? { scale: 0.98 } : {}}
                                    onClick={onConfirm}
                                    disabled={currentBet === 0}
                                    className={`flex-1 py-3 rounded-lg font-bold text-base shadow-lg border-b-4 transition-all cursor-pointer
                                        ${currentBet > 0
                                            ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black border-amber-700'
                                            : 'bg-gray-700 text-gray-400 border-gray-800 cursor-not-allowed'}`}
                                >
                                    {currentBet > 0 ? '✅ ยืนยัน' : 'กรุณาเลือกชิป'}
                                </motion.button>

                                {/* Raise Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleOpenRaise}
                                    className="px-4 py-3 rounded-lg font-bold text-base shadow-lg border-b-4 transition-all cursor-pointer
                                        bg-gradient-to-r from-red-500 to-red-700 text-white border-red-800 hover:shadow-red-500/30"
                                >
                                    🔥 เกทับ
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

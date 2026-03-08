import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SFX, speakPhrase } from '../utils/sound';
import { formatChips, numberToThaiVoice } from '../utils/formatChips';
import { getChipStyle } from '../utils/chipColors';

interface ChipSelectorProps {
    maxBet: number;       // room maxBet (capped at chips) — for normal chip buttons
    minBet?: number;      // mandatory minimum bet (defaults to 0)
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
    maxBet, minBet = 0, totalChips, currentBet, lastBet, chipPresets, category,
    onSelect, onConfirm, disabled = false,
}: ChipSelectorProps) {
    const [showRaise, setShowRaise] = useState(false);
    const [raiseAmount, setRaiseAmount] = useState(0);
    const lastSliderTickRef = useRef(0);

    const handleAddChip = useCallback((amount: number) => {
        const newTotal = currentBet + amount;
        if (newTotal <= maxBet) {
            SFX.chipStack();
            speakPhrase(numberToThaiVoice(amount));
            onSelect(newTotal);
        }
    }, [currentBet, maxBet, onSelect]);

    const handleClear = useCallback(() => {
        SFX.click();
        speakPhrase('เรียกคืน');
        onSelect(0);
    }, [onSelect]);

    const handleOpenRaise = useCallback(() => {
        SFX.click();
        speakPhrase('จะเกทับเท่าไหร่ดีคะ');
        // Start slider at current bet or minBet equivalent
        setRaiseAmount(Math.max(currentBet, maxBet > 0 ? maxBet : 0));
        setShowRaise(true);
    }, [currentBet, maxBet]);

    const handleConfirmRaise = useCallback(() => {
        if (raiseAmount === totalChips) {
            SFX.allIn();
            speakPhrase('สู้หมดหน้าตัก!');
        } else {
            SFX.betConfirm();
            speakPhrase(`เกทับ ${numberToThaiVoice(raiseAmount)}`);
        }
        onSelect(raiseAmount);
        setShowRaise(false);
    }, [raiseAmount, totalChips, onSelect]);

    const handleCancelRaise = useCallback(() => {
        SFX.click();
        setShowRaise(false);
    }, []);

    // Percentage quick picks
    const { pct25, pct50, pct75, allIn } = useMemo(() => ({
        pct25: Math.floor(totalChips * 0.25),
        pct50: Math.floor(totalChips * 0.50),
        pct75: Math.floor(totalChips * 0.75),
        allIn: totalChips
    }), [totalChips]);

    const sortedPresets = useMemo(() => [...chipPresets].sort((a, b) => a - b), [chipPresets]);

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
                        <div className="w-full px-2 mb-5">
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
                                className="w-full h-4 sm:h-3 rounded-full appearance-none cursor-pointer 
                                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                                           [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg
                                           [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0"
                                style={{
                                    background: `linear-gradient(to right, #f59e0b ${(raiseAmount / totalChips) * 100}%, rgba(255,255,255,0.1) ${(raiseAmount / totalChips) * 100}%)`,
                                }}
                            />
                        </div>

                        {/* Quick Pick Buttons */}
                        <div className="grid grid-cols-4 gap-2 mb-5">
                            {[
                                { label: '25%', value: pct25 },
                                { label: '50%', value: pct50 },
                                { label: '75%', value: pct75 },
                                { label: 'All-in', value: allIn },
                            ].map(({ label, value }) => (
                                <motion.button
                                    key={label}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={() => { SFX.click(); setRaiseAmount(value); speakPhrase(label === 'All-in' ? 'ทุ่มหมดตัว' : numberToThaiVoice(value)); }}
                                    className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border shadow-sm
                                        ${raiseAmount === value
                                            ? label === 'All-in'
                                                ? 'bg-gradient-to-b from-red-500 to-red-700 text-white border-red-800 shadow-red-500/30 ring-1 ring-red-500/50'
                                                : 'bg-gradient-to-b from-yellow-400 to-amber-500 text-black border-amber-600 shadow-yellow-500/30 ring-1 ring-yellow-500/50'
                                            : label === 'All-in'
                                                ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    <div>{label}</div>
                                    <div className={`text-[10px] mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis px-1
                                        ${raiseAmount === value ? (label === 'All-in' ? 'text-white/80' : 'text-black/60') : 'text-gray-500'}`}>
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
                            <p className="text-yellow-400/80 text-sm font-medium">💰 วางเดิมพัน</p>
                            {currentBet > 0 && (
                                <button
                                    onClick={handleClear}
                                    className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
                                >
                                    เรียกคืน
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
                                        whileTap={canAdd ? { scale: 0.92 } : {}}
                                        disabled={!canAdd}
                                        onClick={() => handleAddChip(amount)}
                                        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-lg flex items-center justify-center
                                            bg-gradient-to-br ${style.fromTo} border border-white/10 ${style.border}
                                            ${!canAdd ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:brightness-110 cursor-pointer hover:-translate-y-1'}`}
                                    >
                                        <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-white/40 opacity-80" />
                                        <div className="absolute w-[68%] h-[68%] rounded-full border border-white/20 bg-black/10 flex items-center justify-center shadow-inner">
                                            <div className="w-[85%] h-[85%] rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                                                <span className={`${style.textColor} font-bold text-sm sm:text-base z-10`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                                    {formatChips(amount)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 rounded-full border-b-[3px] border-black/30 pointer-events-none" />
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Repeat Bet Button (Moved outside Total container) */}
                        {lastBet && lastBet > 0 && lastBet <= totalChips && currentBet === 0 && (
                            <div className="flex justify-center w-full mb-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { SFX.repeatBet(); speakPhrase(`วางทุนเดิม ${numberToThaiVoice(lastBet)} นะคะ`); onSelect(lastBet); }}
                                    className="px-5 py-2.5 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/40 rounded-xl text-sm font-bold text-yellow-300 flex items-center gap-2 transition cursor-pointer shadow-md"
                                >
                                    <span className="text-lg leading-none">↺</span> วางทุนเดิม ({formatChips(lastBet)})
                                </motion.button>
                            </div>
                        )}

                        {/* Total Display & Confirm + Raise */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center w-full bg-black/30 rounded-2xl p-4 border border-white/10 shadow-inner"
                        >
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-gray-400 text-sm font-medium">ยอดรวมเดิมพัน</span>
                                <div>
                                    <span className="text-yellow-300 font-bold text-3xl">{formatChips(currentBet)}</span>
                                    <span className="text-xs text-gray-500 ml-1 font-medium">/ {formatChips(totalChips)}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {/* Confirm Button */}
                                <motion.button
                                    whileHover={currentBet >= minBet ? { scale: 1.02 } : {}}
                                    whileTap={currentBet >= minBet ? { scale: 0.98 } : {}}
                                    onClick={onConfirm}
                                    disabled={currentBet < minBet}
                                    className={`flex-1 py-3.5 rounded-xl font-bold text-lg shadow-lg border-b-[5px] transition-all cursor-pointer
                                        ${currentBet >= minBet
                                            ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black border-amber-800'
                                            : 'bg-gray-800 text-gray-500 border-gray-900 cursor-not-allowed'}`}
                                >
                                    {currentBet >= minBet ? '✅ ยืนยัน' : 'รอวางเดิมพัน'}
                                </motion.button>

                                {/* Raise Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleOpenRaise}
                                    className="px-5 py-3.5 rounded-xl font-bold text-lg shadow-lg border-b-[5px] transition-all cursor-pointer
                                        bg-gradient-to-r from-red-500 to-red-700 text-white border-red-900 hover:shadow-red-500/30 flex items-center gap-1"
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

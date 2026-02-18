import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '../types/game';
import { SFX } from '../utils/sound';
import { evaluateHand } from '../utils/deck';
import { formatChips } from '../utils/formatChips';

interface ResultOverlayProps {
    players: Player[];
    dealerIndex: number;
    message: string;
    onNext: () => void;
    onQuit: () => void;
}

export default function ResultOverlay({
    players,
    dealerIndex,
    message,
    onNext,
    onQuit,
}: ResultOverlayProps) {
    const humanPlayer = players.find(p => p.isHuman)!;
    const isWin = humanPlayer.result === 'win';
    const isDraw = humanPlayer.result === 'draw';

    const headerColor = isWin ? 'text-yellow-300' : isDraw ? 'text-gray-300' : 'text-red-400';
    const glowColor = isWin ? 'rgba(250,204,21,0.15)' : isDraw ? 'rgba(200,200,200,0.08)' : 'rgba(239,68,68,0.12)';

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="glass p-5 sm:p-7 max-w-sm w-full relative overflow-hidden"
                    initial={{ scale: 0.85, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                >
                    {/* Background glow */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at 50% 20%, ${glowColor}, transparent 70%)` }}
                    />

                    {/* Result Header */}
                    <motion.div
                        className={`text-center font-bold mb-4 whitespace-pre-line leading-tight relative z-10 ${headerColor} ${message.includes('\n') ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl'}`}
                        animate={{ scale: [1, 1.04, 1] }}
                        transition={{ repeat: 2, duration: 0.4 }}
                    >
                        {message}
                    </motion.div>

                    {/* Player Results */}
                    <div className="space-y-1.5 mb-5 max-h-[40vh] overflow-y-auto relative z-10 scroll-smooth">
                        {players.map((p, i) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`flex items-center justify-between p-2.5 rounded-xl text-sm
                                    ${p.result === 'win'
                                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                                        : p.result === 'lose'
                                            ? 'bg-red-500/8 border border-red-500/15'
                                            : 'bg-white/3 border border-white/5'}`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                                        style={{ background: `linear-gradient(135deg, ${p.avatarColor}, ${p.avatarColor}cc)` }}
                                    >
                                        {p.name.charAt(0)}
                                    </div>
                                    <span className="font-medium truncate text-white/90">
                                        {p.name}
                                        {i === dealerIndex && (
                                            <span className="text-yellow-500/60 text-[10px] ml-1">(D)</span>
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-gray-500 text-xs tabular-nums min-w-[80px] text-right">
                                        {evaluateHand(p.cards).name}{p.dengMultiplier > 1 ? ` ×${p.dengMultiplier}` : ''}
                                    </span>
                                    <span className={`font-bold text-[11px] px-2 py-0.5 rounded-full ${p.result === 'win'
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : p.result === 'lose'
                                            ? 'bg-red-500/20 text-red-300'
                                            : 'bg-yellow-500/15 text-yellow-300'
                                        }`}>
                                        {p.result === 'win' ? 'ชนะ' : p.result === 'lose' ? 'แพ้' : 'เสมอ'}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Chip Balance */}
                    <div className="text-center mb-4 p-3 rounded-xl bg-white/3 border border-white/5 relative z-10">
                        <span className="text-gray-400 text-sm">ชิปของคุณ </span>
                        <span className="text-yellow-300 font-bold text-2xl">{formatChips(humanPlayer.chips)}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2.5 relative z-10">
                        <motion.button
                            whileHover={{ scale: 1.03, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => { SFX.click(); onNext(); }}
                            className="btn-gold flex-1 text-lg py-3.5"
                        >
                            เล่นต่อ
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => { SFX.navigate(); onQuit(); }}
                            className="btn-dark flex-1 text-lg py-3.5"
                        >
                            กลับ
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { evaluateHand } from '../utils/deck';
import Card from './Card';
import PlayerAvatar from './PlayerAvatar';
import { formatChips } from '../utils/formatChips';

export default function RoundResultSummary() {
    const { players, dealerIndex, nextRound, isSpectating, config } = useGameStore();

    const dealer = players[dealerIndex];
    // Sort players: Dealer first, then Human, then others
    const sortedPlayers = [...players]
        .filter(p => !isSpectating || !p.isHuman) // Hide human when spectating
        .sort((a, b) => {
            if (a.isDealer) return -1;
            if (b.isDealer) return 1;
            if (a.isHuman) return -1;
            if (b.isHuman) return 1;
            return 0;
        });

    const humanPlayer = players.find(p => p.isHuman);
    const humanIsDealer = humanPlayer?.isDealer;

    // Calculate Dealer Stats
    const dealerTotalWin = players
        .filter(p => !p.isDealer && p.result === 'lose')
        .reduce((sum, p) => sum + Math.abs(p.roundProfit || 0), 0);

    const dealerTotalLoss = players
        .filter(p => !p.isDealer && p.result === 'win')
        .reduce((sum, p) => sum + Math.abs(p.roundProfit || 0), 0);

    const dealerNet = (dealer?.roundProfit) || (dealerTotalWin - dealerTotalLoss);

    // Auto-advance when spectating
    useEffect(() => {
        if (isSpectating) {
            const timer = setTimeout(() => nextRound(), 3000);
            return () => clearTimeout(timer);
        }
    }, [isSpectating, nextRound]);

    // EPIC WIN EFFECTS (Screen Shake & God Rays for High Tiers)
    const [isEpicWin, setIsEpicWin] = useState(false);
    const [shakeSequence, setShakeSequence] = useState<any>({});

    useEffect(() => {
        const category = config?.room?.category;
        const profit = humanPlayer?.roundProfit || 0;
        if (profit > 0 && (category === 'ULTIMATE' || category === 'LEGENDARY')) {
            setIsEpicWin(true);

            // Generate a wild shake sequence for framer-motion
            if (category === 'ULTIMATE') {
                setShakeSequence({
                    x: [0, -15, 20, -25, 10, -10, 5, 0],
                    y: [0, 20, -15, 15, -20, 10, -5, 0],
                    rotate: [0, -2, 3, -1, 2, -1, 0]
                });
            } else if (category === 'LEGENDARY') {
                setShakeSequence({
                    x: [0, -8, 10, -8, 5, -2, 0],
                    y: [0, 10, -8, 8, -5, 2, 0],
                });
            }

            // Vibrate device if supported
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 300, 500]);
            }
        }
    }, [config?.room?.category, humanPlayer?.roundProfit]);

    return (
        <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-hidden"
            animate={isEpicWin ? shakeSequence : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
        >
            {/* God Rays / Energy Flare for EPIC WINS */}
            {isEpicWin && (
                <div className="absolute inset-0 pointer-events-none flex justify-center items-center z-0 overflow-hidden mix-blend-screen">
                    <motion.div
                        className="absolute w-[200vw] h-[200vh] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(253,224,71,0.5)_20deg,transparent_40deg,rgba(253,224,71,0.5)_60deg,transparent_80deg,rgba(253,224,71,0.5)_100deg,transparent_120deg)]"
                        animate={{ rotate: 360, opacity: [0, 1, 0.5, 0] }}
                        transition={{ rotate: { duration: 15, repeat: Infinity, ease: "linear" }, opacity: { duration: 3, times: [0, 0.1, 0.3, 1] } }}
                    />
                    <motion.div
                        className="absolute w-full h-full bg-yellow-400 blur-[150px]"
                        animate={{ opacity: [0, 0.8, 0] }}
                        transition={{ duration: 1.5, times: [0, 0.1, 1] }}
                    />
                </div>
            )}

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-4xl bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
                style={isEpicWin ? {
                    boxShadow: '0 0 100px rgba(234, 179, 8, 0.6), inset 0 0 30px rgba(234, 179, 8, 0.3)',
                    border: '2px solid rgba(253, 224, 71, 0.8)'
                } : {}}
            >
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5 relative overflow-hidden">
                    {/* Flash effect on header if epic win */}
                    {isEpicWin && (
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 z-0"
                            animate={{ x: ['-100%', '100%'], opacity: [0, 0.6, 0] }}
                            transition={{ duration: 1, delay: 0.2 }}
                        />
                    )}

                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 relative z-10">
                        {isEpicWin ? 'ชัยชนะเหนือระดับ!!' : 'สรุปผล'}
                    </h2>
                    {isSpectating && (
                        <span className="text-white/40 text-sm animate-pulse relative z-10">👀 ดูอยู่...</span>
                    )}
                    {!isSpectating && humanIsDealer && (
                        <div className="flex gap-4 text-sm font-medium relative z-10">
                            <span className="text-emerald-400">ได้: +{formatChips(dealerTotalWin)}</span>
                            <span className="text-red-400">เสีย: -{formatChips(dealerTotalLoss)}</span>
                            <span className={dealerNet >= 0 ? 'text-yellow-400' : 'text-red-400'}>
                                สุทธิ: {dealerNet > 0 ? '+' : ''}{formatChips(dealerNet)}
                            </span>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2">
                    {sortedPlayers.map((p) => {
                        const handResult = evaluateHand(p.cards);
                        const profit = p.roundProfit || 0;
                        const isWin = profit > 0;
                        const isLoss = profit < 0;
                        const colorClass = isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-gray-400';

                        // Human row highlighting for epic wins
                        const isHumanEpicWin = isEpicWin && p.isHuman;
                        const bgClass = isHumanEpicWin
                            ? 'bg-gradient-to-r from-yellow-900/50 to-amber-900/50 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]'
                            : p.isHuman
                                ? 'bg-white/10 border-yellow-500/30'
                                : p.isDealer
                                    ? 'bg-black/40 border-white/5'
                                    : 'bg-white/5 border-white/5';

                        return (
                            <motion.div
                                key={p.id}
                                layout
                                className={`flex items-center gap-3 p-3 rounded-xl border ${bgClass}`}
                            >
                                {/* Avatar & Name */}
                                <div className="flex items-center gap-3 w-32 sm:w-40 shrink-0">
                                    <div className="scale-75 origin-left">
                                        <PlayerAvatar
                                            name={p.name}
                                            color={p.avatarColor}
                                            avatarUrl={p.avatarUrl}
                                            chips={p.chips}
                                            isDealer={p.isDealer}
                                            isActive={false}
                                            result={p.result}
                                            size={48}
                                            hideInfo={true}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-bold truncate ${p.isHuman ? 'text-yellow-300' : 'text-white'}`}>
                                            {p.name} {p.isHuman && '(คุณ)'}
                                        </span>
                                        <span className="text-xs text-white/50">
                                            {p.isDealer ? 'เจ้ามือ' : `เดิมพัน: ${formatChips(p.bet)}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Cards & Hand Type */}
                                <div className="flex-1 flex flex-col sm:flex-row items-center gap-4">
                                    <div className="flex -space-x-2">
                                        {p.cards.map((c) => (
                                            <div key={c.id} className="transform scale-75 origin-left">
                                                <Card card={c} small category={config?.room?.category} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white text-sm sm:text-base">
                                            {handResult.name}
                                        </span>
                                        {handResult.deng > 1 && (
                                            <span className="text-xs text-yellow-400 font-bold">
                                                {handResult.deng} เด้ง
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Net Result */}
                                <div className="w-24 sm:w-32 text-right shrink-0">
                                    <span className={`font-mono font-bold text-lg ${colorClass} ${isHumanEpicWin ? 'animate-pulse text-2xl drop-shadow-[0_0_10px_currentColor]' : ''}`}>
                                        {profit > 0 ? '+' : ''}{formatChips(profit)}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black/20 flex justify-center">
                    {isSpectating ? (
                        <span className="text-white/40 text-sm animate-pulse">กำลังไปรอบต่อไป...</span>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={nextRound}
                            className="btn-gold px-12 py-3 text-xl font-bold rounded-xl shadow-lg"
                        >
                            รอบต่อไป →
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

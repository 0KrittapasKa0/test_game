import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useOnlineStore } from '../store/useOnlineStore';
import { evaluateHand } from '../utils/deck';
import Card from './Card';
import PlayerAvatar from './PlayerAvatar';
import { formatChips } from '../utils/formatChips';

export default function OnlineRoundResultSummary() {
    const { players, dealerIndex, nextRound, isSpectating, isHost } = useOnlineStore();

    const dealer = players[dealerIndex] || players.find(p => p.isDealer);

    const sortedPlayers = useMemo(() => {
        return [...players]
            .filter(p => !isSpectating || !p.isHuman)
            .sort((a, b) => {
                if (a.isDealer) return -1;
                if (b.isDealer) return 1;
                if (a.isHuman) return -1; // Keep local human top
                if (b.isHuman) return 1;
                return 0;
            });
    }, [players, isSpectating]);

    // Pre-calculate derived state to avoid calculating inside map
    const dealerStats = useMemo(() => {
        if (!dealer) return null;

        let totalWin = 0;
        let totalLoss = 0;

        players.forEach((p: any) => {
            if (p.isDealer) return;
            if (p.result === 'lose') totalWin += Math.abs(p.roundProfit || 0);
            if (p.result === 'win') totalLoss += Math.abs(p.roundProfit || 0);
        });

        const net = (dealer?.roundProfit) || (totalWin - totalLoss);
        return { totalWin, totalLoss, net };
    }, [players, dealer]);

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full max-w-4xl bg-[#111] border border-gray-800 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] z-10"
                style={{ willChange: 'transform' }}
            >
                {/* Header */}
                <div className="h-14 sm:h-16 px-4 border-b border-gray-800 flex items-center justify-between bg-[#1a1a1a]">
                    <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 py-1">
                        สรุปผล
                    </h2>
                    {isSpectating && (
                        <span className="text-gray-400 text-sm">👀 ดูอยู่...</span>
                    )}
                    {dealerStats && (
                        <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
                            <span className="text-emerald-400">ได้: +{formatChips(dealerStats.totalWin)}</span>
                            <span className="text-red-400">เสีย: -{formatChips(dealerStats.totalLoss)}</span>
                            <span className={dealerStats.net >= 0 ? 'text-yellow-400' : 'text-red-400'}>
                                สุทธิ: {dealerStats.net > 0 ? '+' : ''}{formatChips(dealerStats.net)}
                            </span>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 space-y-1.5 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {sortedPlayers.map((p: any, index: number) => {
                        const handResult = evaluateHand(p.cards);
                        const profit = p.roundProfit || 0;
                        const isWin = profit > 0;
                        const isLoss = profit < 0;
                        const colorClass = isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-gray-400';
                        const isHumanOwner = p.isHuman || p.id === 'human';
                        const bgClass = isHumanOwner
                            ? 'bg-[#222] border-yellow-600/50'
                            : p.isDealer
                                ? 'bg-[#000] border-gray-800'
                                : 'bg-[#151515] border-transparent';

                        const nameText = `${p.name}${isHumanOwner ? ' (คุณ)' : ''}`;
                        const subText = p.isDealer ? 'เจ้ามือ' : `เดิมพัน: ${formatChips(p.bet)}`;

                        return (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.2 }}
                                className={`grid grid-cols-3 items-center p-3 sm:p-4 rounded-xl border ${bgClass}`}
                            >
                                {/* Left Column: Avatar & Name */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0">
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
                                    <div className="flex flex-col min-w-0">
                                        <span className={`font-bold text-sm sm:text-base truncate leading-tight ${isHumanOwner ? 'text-yellow-400' : 'text-white'}`}>
                                            {nameText}
                                        </span>
                                        <span className="text-xs text-gray-400 truncate mt-0.5">
                                            {subText}
                                        </span>
                                    </div>
                                </div>

                                {/* Center Column: Cards & Hand Name (Stacked & Centered) */}
                                <div className="flex flex-col items-center justify-center">
                                    <div className="flex -space-x-2">
                                        {p.cards.map((c: any) => (
                                            <div key={c.id} className="relative z-0">
                                                <Card card={c} small={true} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-col items-center mt-2 leading-tight">
                                        <span className="font-bold text-white text-[11px] sm:text-sm">
                                            {handResult.name}
                                        </span>
                                        {handResult.deng > 1 && (
                                            <span className="text-xs sm:text-sm text-yellow-400 font-bold mt-0.5">
                                                {handResult.deng} เด้ง
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Net Result */}
                                <div className="flex justify-end pr-2 sm:pr-4">
                                    <span className={`font-mono font-bold text-base sm:text-xl ${colorClass}`}>
                                        {profit > 0 ? '+' : ''}{formatChips(profit)}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="h-16 sm:h-20 border-t border-gray-800 bg-[#0f0f0f] flex items-center justify-center shrink-0">
                    {!isHost ? (
                        <span className="text-gray-400 text-sm">รอโฮสต์เริ่มรอบใหม่...</span>
                    ) : (
                        <button
                            onClick={nextRound}
                            className="bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700 active:scale-95 transition-all w-48 py-2.5 sm:py-3 text-lg sm:text-xl font-bold rounded-lg text-[#111] shadow-md touch-manipulation"
                        >
                            เริ่มรอบต่อไป →
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

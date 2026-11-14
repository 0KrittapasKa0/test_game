import { useOnlineStore } from '../store/useOnlineStore';
import PlayerAvatar from './PlayerAvatar';
import Card from './Card';
import DealingDeck from './DealingDeck';
import { getDealerAction } from '../utils/dealerAnimation';
import { motion } from 'framer-motion';
import { evaluateHand } from '../utils/deck';
import ChipStack from './ChipStack';
import RoundChipSettlement from './RoundChipSettlement';
import FloatingEmoji, { type FloatingEmojiEvent } from './FloatingEmoji';
import { useMemo } from 'react';

// This is a simplified version of GameTable for the online mode.
// We reuse the basic rendering but hook it into useOnlineStore.

interface SeatPosition {
    x: number;
    y: number;
}

function computeSeatPositions(
    playerCount: number,
    dealerIndex: number,
    humanIndex: number,
): SeatPosition[] {
    const positions: (SeatPosition | null)[] = new Array(playerCount).fill(null);

    // Dealer: Top Center
    positions[dealerIndex] = { x: 50, y: -5 };

    // Human: Bottom Center
    if (humanIndex !== dealerIndex && humanIndex >= 0) {
        positions[humanIndex] = { x: 50, y: 94 };
    }

    const unassigned: number[] = [];
    for (let i = 0; i < playerCount; i++) {
        if (positions[i] === null) unassigned.push(i);
    }

    const total = unassigned.length;
    if (total > 0) {
        if (total === 1) {
            positions[unassigned[0]] = { x: -5, y: 50 };
        } else if (total === 2) {
            positions[unassigned[0]] = { x: -5, y: 50 };
            positions[unassigned[1]] = { x: 105, y: 50 };
        } else if (total === 3) {
            positions[unassigned[0]] = { x: -5, y: 25 };
            positions[unassigned[1]] = { x: -5, y: 75 };
            positions[unassigned[2]] = { x: 105, y: 50 };
        } else if (total === 4) {
            positions[unassigned[0]] = { x: -5, y: 25 };
            positions[unassigned[1]] = { x: -5, y: 75 };
            positions[unassigned[2]] = { x: 105, y: 25 };
            positions[unassigned[3]] = { x: 105, y: 75 };
        } else {
            // Distribute remaining evenly around a circle
            for (let i = 0; i < total; i++) {
                const angle = Math.PI + (Math.PI / (total + 1)) * (i + 1);
                positions[unassigned[i]] = {
                    x: 50 + 45 * Math.cos(angle),
                    y: 50 - 40 * Math.sin(angle)
                };
            }
        }
    }

    return positions as SeatPosition[];
}

// คำนวณตำแหน่งชิปบนโต๊ะ (เลื่อนเข้าหาจุดกลาง)
function getChipPosition(playerPos: SeatPosition): SeatPosition {
    const t = 0.35;
    return {
        x: playerPos.x + (50 - playerPos.x) * t,
        y: playerPos.y + (50 - playerPos.y) * t,
    };
}

export default function OnlineGameTable({ emojiEvents }: { emojiEvents: FloatingEmojiEvent[] }) {
    const players = useOnlineStore(s => s.players);
    const gamePhase = useOnlineStore(s => s.gamePhase);
    const activePlayerIndex = useOnlineStore(s => s.activePlayerIndex);
    const showCards = useOnlineStore(s => s.showCards);
    const localPlayerId = useOnlineStore(s => s.localPlayerId);
    const config = useOnlineStore(s => s.config);

    const activePlayers = useMemo(() => players.filter(p => !p.isSpectating), [players]);
    const activeHumanIndex = activePlayers.findIndex(p => p.id === localPlayerId);
    const activeDealerIndex = activePlayers.findIndex(p => p.isDealer);

    const seatPositions = useMemo(
        () =>
            activePlayers.length > 0
                ? computeSeatPositions(activePlayers.length, activeDealerIndex >= 0 ? activeDealerIndex : 0, activeHumanIndex >= 0 ? activeHumanIndex : -1)
                : [],
        [activePlayers.length, activeDealerIndex, activeHumanIndex],
    );
    const totalCardsDealt = useMemo(
        () => players.reduce((sum, p) => sum + p.cards.length, 0),
        [players],
    );





    return (
        <div className="absolute inset-0 z-30 pointer-events-none" data-card-table>
            {/* Room Info Display - Mirrored from GameTable.tsx */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                <div className="flex flex-col items-center opacity-[0.07]">
                    <span className="text-3xl sm:text-5xl md:text-6xl font-bold text-yellow-300 tracking-[0.2em] font-serif"
                        style={{ textShadow: '0 0 40px rgba(255,215,100,0.3)' }}
                    >
                        ป๊อกเด้ง
                    </span>
                    <div className="w-28 sm:w-40 h-px bg-linear-to-r from-transparent via-yellow-400/40 to-transparent mt-2 mb-2" />
                    {config && (
                        <span className="text-sm sm:text-base font-light text-yellow-200/80 tracking-widest uppercase">
                            {config.room.name}
                        </span>
                    )}
                </div>
            </div>



            <DealingDeck dealing={gamePhase === 'DEALING'} />

            {/* ===== Render Chips on Table ===== */}
            {gamePhase !== 'ROUND_END' && activePlayers.map((player, idx) => {
                const pos = seatPositions[idx];
                if (!pos || player.isDealer || player.bet <= 0) return null;
                const chipPos = getChipPosition(pos);

                return (
                    <div
                        key={`chips-${player.id}`}
                        className="absolute z-3 pointer-events-none transition-all duration-500"
                        style={{
                            left: `${chipPos.x}%`,
                            top: `${chipPos.y}%`,
                            transform: 'translate(-50%, -50%) scale(0.85)',
                        }}
                    >
                        <ChipStack amount={player.bet} chipPresets={config?.room.chipPresets} category={config?.room.category} />
                    </div>
                );
            })}

            {/* ===== Round Settlement Chip Animation ===== */}
            {gamePhase === 'ROUND_END' && (
                <RoundChipSettlement
                    activePlayers={activePlayers}
                    seatPositions={seatPositions}
                    chipPresets={config?.room.chipPresets}
                    category={config?.room.category}
                />
            )}

            {/* ===== Players Layer ===== */}
            <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible', zIndex: 20 }}>
                {activePlayers.map((player, idx) => {
                    const pos = seatPositions[idx];
                    if (!pos) return null;

                    const isHuman = player.id === localPlayerId;
                    const isActive = activePlayerIndex === idx;
                    const isPanel = !isHuman;

                    // Z based on Y (bottom in front)
                    const zIndex = 30 + Math.floor(pos.y);

                    return (
                        <div
                            key={player.id}
                            className={`absolute flex flex-col items-center pointer-events-auto transition-all duration-500`}
                            style={{
                                left: `clamp(16px, ${pos.x}%, calc(100% - 16px))`,
                                top: `${pos.y + (player.isDealer && !player.isHuman ? 10 : 0)}%`,
                                transform: 'translate(-50%, -50%)',
                                minWidth: '100px',
                                zIndex: isActive ? 100 : zIndex,
                            }}
                        >
                            <div className="relative flex flex-col items-center z-0 pointer-events-auto group">
                                {/* Avatar + Cards Area */}
                                <div className="relative z-20">
                                    {/* Avatar */}
                                    <PlayerAvatar
                                        name={player.name}
                                        color={player.avatarColor}
                                        avatarUrl={player.avatarUrl}
                                        chips={player.chips}
                                        isDealer={player.isDealer}
                                        dealerAction={player.isDealer && !player.isHuman ? getDealerAction(gamePhase, totalCardsDealt, player.result) : undefined}
                                        dealerCue={totalCardsDealt}
                                        dealerVariant={player.isDealer && !player.isHuman ? config?.dealerVariant : undefined}
                                        isActive={isActive}
                                        result={gamePhase === 'ROUND_END' ? player.result : 'pending'}
                                        size={isHuman ? 60 : 48}
                                        isSpectating={player.isSpectating}
                                    />

                                    {/* Floating Emoji component placed over avatar */}
                                    <div className="absolute inset-0 z-[120] pointer-events-none">
                                        <FloatingEmoji events={emojiEvents} playerId={player.id} />
                                    </div>

                                    {/* Score Badge (for opponents when cards revealed) */}
                                    {isPanel && (showCards || player.hasPok) && player.score >= 0 && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
                                            className="absolute -bottom-1 -right-1 z-50"
                                        >
                                            <div
                                                className="px-2 py-1 rounded-full flex items-center justify-center min-w-[60px]"
                                                style={{
                                                    background: player.hasPok
                                                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                                        : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                                    border: '2px solid rgba(255,255,255,0.9)',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                                }}
                                            >
                                                <span className="text-[10px] font-bold text-white text-center">
                                                    {evaluateHand(player.cards).name}
                                                </span>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Opponents: Tiny cards below avatar */}
                            {isPanel && player.cards.length > 0 && (
                                <div className="flex items-center justify-center -space-x-3 mt-0.5 z-10 scale-75 origin-top">
                                    {player.cards.map((card, ci) => (
                                        <div key={card.id} style={{ zIndex: ci }}>
                                            <Card
                                                card={card}
                                                dealFromDeck={gamePhase === 'DEALING'}
                                                faceDown={!showCards && gamePhase !== 'ROUND_END' && !player.hasPok}
                                                delay={ci * 0.1}
                                                small={true}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Human: Cards below avatar + score */}
                            {isHuman && player.cards.length > 0 && (
                                <div className="absolute top-[50%] left-1/2 -translate-x-1/2 flex flex-col items-center z-10 w-max">
                                    {/* Human score badge - MOVED ABOVE CARDS */}
                                    {player.score >= 0 && (
                                        <motion.div
                                            className="mb-1"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
                                        >
                                            <div
                                                className="px-3 py-1 rounded-full flex items-center gap-1.5"
                                                style={{
                                                    background: player.hasPok
                                                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                                        : player.score >= 8
                                                            ? 'linear-gradient(135deg, #10b981, #059669)'
                                                            : 'linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4))',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                                                }}
                                            >
                                                <span className="text-white font-bold text-sm">
                                                    {evaluateHand(player.cards).name}
                                                </span>
                                                {player.dengMultiplier > 1 && (
                                                    <span className="text-yellow-300 font-bold text-xs">
                                                        ×{player.dengMultiplier}
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="flex items-center justify-center gap-2 scale-105">
                                        {player.cards.map((card, ci) => (
                                            <div key={card.id} style={{ zIndex: ci }}>
                                                <Card
                                                    card={card}
                                                    dealFromDeck={gamePhase === 'DEALING'}
                                                    faceDown={false}
                                                    delay={ci * 0.1}
                                                    small={false}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}


                        </div>
                    );
                })}
            </div>
        </div>
    );
}

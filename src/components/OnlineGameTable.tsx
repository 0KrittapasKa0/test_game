import { useOnlineStore } from '../store/useOnlineStore';
import PlayerAvatar from './PlayerAvatar';
import Card from './Card';
import { motion } from 'framer-motion';
import { evaluateHand } from '../utils/deck';
// Removed unused imports
import ChipStack from './ChipStack';
import { useState, useCallback, useRef, useEffect } from 'react';
import { formatChips } from '../utils/formatChips';

// This is a simplified version of GameTable for the online mode.
// We reuse the basic rendering but hook it into useOnlineStore.

interface SeatPosition {
    x: number;
    y: number;
}

/** Animated card that flies from the deck center to a player's seat */
function FlyingCardElement({ targetX, targetY, onComplete }: {
    targetX: number;
    targetY: number;
    onComplete: () => void;
}) {
    return (
        <motion.div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 60, willChange: 'transform' }}
            initial={{ x: '50%', y: '50%' }}
            animate={{ x: `${targetX}%`, y: `${targetY}%` }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            onAnimationComplete={onComplete}
        >
            <motion.div
                className="absolute top-0 left-0"
                style={{ width: '48px', height: '68px', willChange: 'transform, opacity' }}
                initial={{ x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
                animate={{ x: '-50%', y: '-50%', scale: 0.65, opacity: [1, 1, 0.3] }}
                transition={{
                    duration: 0.28,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    opacity: { times: [0, 0.6, 1] },
                }}
            >
                <div
                    className="w-full h-full rounded-md bg-white p-[3px] sm:p-[4px]"
                    style={{
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    }}
                >
                    <div className="w-full h-full rounded-[4px] border-[1.5px] border-[#e5e7eb] flex items-center justify-center">
                        <span className="text-[#e5e7eb] text-sm drop-shadow-none leading-none">
                            ♠
                        </span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
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

export default function OnlineGameTable() {
    const { players, gamePhase, activePlayerIndex, isDealing, showCards, localPlayerId, config } = useOnlineStore();

    const activePlayers = players.filter(p => !p.isSpectating);
    const activeHumanIndex = activePlayers.findIndex(p => p.id === localPlayerId);
    const activeDealerIndex = activePlayers.findIndex(p => p.isDealer);

    const seatPositions = activePlayers.length > 0
        ? computeSeatPositions(activePlayers.length, activeDealerIndex >= 0 ? activeDealerIndex : 0, activeHumanIndex >= 0 ? activeHumanIndex : -1)
        : [];

    // Animation tracking
    const [flyingCards, setFlyingCards] = useState<{ id: string; targetX: number; targetY: number }[]>([]);
    const prevCardCountsRef = useRef<Record<string, number>>({});

    const removeFlyingCard = useCallback((id: string) => {
        setFlyingCards(prev => prev.filter(fc => fc.id !== id));
    }, []);

    // Detect new cards and trigger flying animation
    useEffect(() => {
        if (!isDealing && gamePhase !== 'DEALING') return;

        activePlayers.forEach((p, idx) => {
            const currentCount = p.cards.length;
            const prevCount = prevCardCountsRef.current[p.id] || 0;

            if (currentCount > prevCount) {
                const pos = seatPositions[idx];
                if (pos) {
                    for (let i = prevCount; i < currentCount; i++) {
                        setFlyingCards(prev => [
                            ...prev,
                            { id: `${p.id}-card-${i}-${Date.now()}`, targetX: pos.x, targetY: pos.y }
                        ]);
                    }
                }
            }
            prevCardCountsRef.current[p.id] = currentCount;
        });
    }, [players, isDealing, gamePhase, seatPositions]);

    // Reset card counts on new round
    useEffect(() => {
        if (gamePhase === 'WAITING' || gamePhase === 'BETTING') {
            prevCardCountsRef.current = {};
            setFlyingCards([]);
        }
    }, [gamePhase]);

    return (
        <div className="absolute inset-0 z-30 pointer-events-none">
            {/* Center Deck Area (Placeholder) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[96px] rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
                <span className="text-white/30 font-bold tracking-widest text-xs uppercase">DECK</span>
            </div>

            {/* Flying Card Animations */}
            {flyingCards.map(fc => (
                <FlyingCardElement
                    key={fc.id}
                    targetX={fc.targetX}
                    targetY={fc.targetY}
                    onComplete={() => removeFlyingCard(fc.id)}
                />
            ))}

            {/* ===== Render Chips on Table ===== */}
            {activePlayers.map((player, idx) => {
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
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
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
                                        isActive={isActive}
                                        result={gamePhase === 'ROUND_END' ? player.result : 'pending'}
                                        size={isHuman ? 60 : 48}
                                        isSpectating={player.isSpectating}
                                    />

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
                                                    faceDown={false}
                                                    delay={ci * 0.1}
                                                    small={false}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bet Amount */}
                            {player.bet > 0 && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                                    <span className="bg-black/60 text-yellow-400 font-bold px-3 py-1 rounded-full text-xs font-mono shadow-md border border-yellow-500/30">
                                        {formatChips(player.bet)}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

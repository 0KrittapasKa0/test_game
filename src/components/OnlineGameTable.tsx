import { useOnlineStore } from '../store/useOnlineStore';
import PlayerAvatar from './PlayerAvatar';
import Card from './Card';
import { motion } from 'framer-motion';
import { evaluateHand } from '../utils/deck';
import { RoomEnvironment } from './RoomEnvironment';
import ChipStack from './ChipStack';
import FloatingEmoji, { type FloatingEmojiEvent } from './FloatingEmoji';
import { tryBotEmoji, trySocialReaction, getContextualEmojiResponse, resetEmojiCooldowns, updateMood } from '../utils/aiEmojiLogic';
import type { EmojiContext } from '../utils/aiEmojiLogic';
import { useState, useCallback, useRef, useEffect } from 'react';

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

// === Custom hook: emoji logic for online mode ===
export function useOnlineEmoji() {
    const { players, gamePhase, activePlayerIndex, localPlayerId, sendEmoji, onEmojiReceived, offEmojiReceived } = useOnlineStore();
    const activePlayers = players.filter(p => !p.isSpectating);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiEvents, setEmojiEvents] = useState<FloatingEmojiEvent[]>([]);

    const handleSendEmoji = useCallback((emoji: string) => {
        if (!localPlayerId) return;

        const newEvent: FloatingEmojiEvent = {
            id: `emoji-${Date.now()}`,
            playerId: localPlayerId,
            emoji,
            timestamp: Date.now()
        };

        setEmojiEvents(prev => [...prev, newEvent]);
        setTimeout(() => {
            setEmojiEvents(prev => prev.filter(e => e.id !== newEvent.id));
        }, 2000);

        // Broadcast to other players via PeerJS
        sendEmoji(emoji);

        // Simulated bots replying if any bots present
        const aiPlayers = activePlayers.filter(p => !p.isHuman);
        if (aiPlayers.length > 0 && Math.random() > 0.4) {
            setTimeout(() => {
                const randomAi = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
                const aiEmoji = getContextualEmojiResponse(emoji, randomAi.id);
                if (aiEmoji) {
                    const aiEvent: FloatingEmojiEvent = {
                        id: `emoji-ai-${Date.now()}`,
                        playerId: randomAi.id,
                        emoji: aiEmoji,
                        timestamp: Date.now()
                    };
                    setEmojiEvents(prev => [...prev, aiEvent]);
                    setTimeout(() => {
                        setEmojiEvents(prev => prev.filter(e => e.id !== aiEvent.id));
                    }, 2000);
                }
            }, 800 + Math.random() * 1500);
        }

    }, [localPlayerId, activePlayers, sendEmoji]);

    // --- Listen for emojis from other players over the network ---
    useEffect(() => {
        const handleRemoteEmoji = (playerId: string, emoji: string, eventId: string) => {
            if (playerId === localPlayerId) return;

            const event: FloatingEmojiEvent = {
                id: eventId,
                playerId,
                emoji,
                timestamp: Date.now()
            };
            setEmojiEvents(prev => [...prev, event]);
            setTimeout(() => {
                setEmojiEvents(prev => prev.filter(e => e.id !== eventId));
            }, 2500);
        };
        onEmojiReceived(handleRemoteEmoji);
        return () => offEmojiReceived(handleRemoteEmoji);
    }, [localPlayerId, onEmojiReceived, offEmojiReceived]);

    // --- Autonomous AI Emojis (Organic Engine v2) ---
    useEffect(() => {
        const aiPlayers = activePlayers.filter(p => !p.isHuman);
        if (aiPlayers.length === 0) return;

        if (gamePhase === 'BETTING') {
            resetEmojiCooldowns();
        }

        const schedule = (playerId: string, emoji: string, delayMs: number) => {
            setTimeout(() => {
                const event: FloatingEmojiEvent = {
                    id: `ai-${Date.now()}-${Math.random()}`,
                    playerId,
                    emoji,
                    timestamp: Date.now()
                };
                setEmojiEvents(prev => [...prev, event]);
                setTimeout(() => {
                    setEmojiEvents(prev => prev.filter(e => e.id !== event.id));
                }, 2500);
            }, delayMs);
        };

        if (gamePhase === 'BETTING') {
            const bot = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
            const emoji = tryBotEmoji(bot.id, 'waiting');
            if (emoji) schedule(bot.id, emoji, 1500 + Math.random() * 3000);
        } else if (gamePhase === 'PLAYER_ACTION') {
            aiPlayers.forEach(bot => {
                if (bot.hasActed) return;
                let ctx: EmojiContext;
                if (bot.hasPok) ctx = 'my_pok';
                else if (bot.score < 4) ctx = 'my_bad_hand';
                else if (bot.score <= 7) ctx = 'my_ok_hand';
                else ctx = 'staying';
                const emoji = tryBotEmoji(bot.id, ctx);
                if (emoji) schedule(bot.id, emoji, 300 + Math.random() * 1000);
            });

            // Social: react to someone else's Pok
            const pokPlayers = activePlayers.filter(p => p.hasPok);
            if (pokPlayers.length > 0) {
                aiPlayers.forEach(bot => {
                    if (bot.hasPok) return;
                    const emoji = trySocialReaction(bot.id, 'see_pok');
                    if (emoji) schedule(bot.id, emoji, 800 + Math.random() * 1500);
                });
            }

            const currentBot = activePlayers[activePlayerIndex];
            if (currentBot && !currentBot.isHuman && !currentBot.hasActed) {
                const ctx: EmojiContext = currentBot.score <= 5 ? 'drawing' : 'staying';
                const emoji = tryBotEmoji(currentBot.id, ctx);
                if (emoji) schedule(currentBot.id, emoji, 400 + Math.random() * 600);
            }
        } else if (gamePhase === 'ROUND_END') {
            aiPlayers.forEach(bot => {
                const result = bot.result === 'win' ? 'win' : bot.result === 'lose' ? 'lose' : 'draw';
                updateMood(bot.id, result as 'win' | 'lose' | 'draw');

                const delay = 1000 + Math.random() * 2500;
                let ctx: EmojiContext;
                if (bot.result === 'win') ctx = 'round_win';
                else if (bot.result === 'lose') ctx = 'round_loss';
                else ctx = 'round_ok';
                const emoji = tryBotEmoji(bot.id, ctx);
                if (emoji) schedule(bot.id, emoji, delay);
            });
        }
    }, [gamePhase, activePlayers, activePlayerIndex]);

    return { emojiEvents, showEmojiPicker, setShowEmojiPicker, handleSendEmoji };
}

export default function OnlineGameTable({ emojiEvents }: { emojiEvents: FloatingEmojiEvent[] }) {
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
            {/* Center Area (Room Info) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                {config && <RoomEnvironment category={config.room.category} />}
            </div>

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


                        </div>
                    );
                })}
            </div>
        </div>
    );
}

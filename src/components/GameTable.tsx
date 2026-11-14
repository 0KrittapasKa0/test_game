import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile } from 'lucide-react';
import Card from './Card';
import DealingDeck from './DealingDeck';
import { TableArtwork } from './GameScene';
import { getDealerAction } from '../utils/dealerAnimation';
import PlayerAvatar from './PlayerAvatar';
import ChipSelector from './ChipSelector';
import ChipStack from './ChipStack';
import RoundChipSettlement from './RoundChipSettlement';
import { useGameStore } from '../store/useGameStore';
import { SFX, speakPhrase } from '../utils/sound';
import { evaluateHand } from '../utils/deck';
import { formatChips, numberToThaiVoice } from '../utils/formatChips';
import EmojiPicker from './EmojiPicker';
import FloatingEmoji, { type FloatingEmojiEvent } from './FloatingEmoji';
import { tryBotEmoji, trySocialReaction, getContextualEmojiResponse, resetEmojiCooldowns, updateMood } from '../utils/aiEmojiLogic';
import type { EmojiContext } from '../utils/aiEmojiLogic';
import { loadSettings } from '../utils/storage';

interface SeatPosition {
    x: number;
    y: number;
}

/**
 * คำนวณตำแหน่งที่นั่งรอบโต๊ะสี่เหลี่ยมแบบสวยงาม
 * Dealer อยู่กลางด้านบน, Human อยู่กลางด้านล่าง
 * ที่เหลือกระจายสวยงามตามขอบโต๊ะ
 */
function computeSeatPositions(
    playerCount: number,
    dealerIndex: number,
    humanIndex: number,
): SeatPosition[] {
    const positions: (SeatPosition | null)[] = new Array(playerCount).fill(null);

    // Dealer: กลางด้านบน (ติดขอบโต๊ะ)
    positions[dealerIndex] = { x: 50, y: -5 };

    // Human: ด้านล่างกลาง
    if (humanIndex !== dealerIndex && humanIndex >= 0) {
        positions[humanIndex] = { x: 50, y: 94 };
    }

    const unassigned: number[] = [];
    for (let i = 0; i < playerCount; i++) {
        if (positions[i] === null) unassigned.push(i);
    }

    const total = unassigned.length;
    if (total > 0) {
        // กรณีพิเศษ: จำนวนน้อยๆ
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
            // 5+ คน:
            // เช็คว่าที่นั่ง 'Bottom' ว่างไหม (คือ Human เป็น Dealer หรือไม่มี Human)
            const isBottomFree = (humanIndex === dealerIndex);

            if (isBottomFree) {
                // แจกแจงลง Left, Bottom, Right
                const bottomCount = Math.floor(total / 3);
                const remaining = total - bottomCount;
                const leftCount = Math.ceil(remaining / 2);
                const rightCount = remaining - leftCount;

                let currentIndex = 0;

                // Left Side
                const leftStartY = 20;
                const leftEndY = 80;
                for (let i = 0; i < leftCount; i++) {
                    const t = leftCount === 1 ? 0.5 : i / (leftCount - 1);
                    const y = leftStartY + t * (leftEndY - leftStartY);
                    positions[unassigned[currentIndex++]] = { x: -5, y };
                }

                // Bottom Side
                const bottomStartX = 25;
                const bottomEndX = 75;
                for (let i = 0; i < bottomCount; i++) {
                    const t = bottomCount === 1 ? 0.5 : i / (bottomCount - 1);
                    const x = bottomStartX + t * (bottomEndX - bottomStartX);
                    positions[unassigned[currentIndex++]] = { x, y: 94 }; // Push out
                }

                // Right Side
                const rightStartY = 20;
                const rightEndY = 80;
                for (let i = 0; i < rightCount; i++) {
                    const t = rightCount === 1 ? 0.5 : i / (rightCount - 1);
                    const y = rightStartY + t * (rightEndY - rightStartY);
                    positions[unassigned[currentIndex++]] = { x: 105, y };
                }

            } else {
                // แบบเดิม (Top & Bottom มีคนจอง หรือ Bottom จองแล้วเหลือแค่ Left/Right)
                // 5+ คน: กระจายสวยงามตามขอบ (นอกโต๊ะไกลๆ)
                const leftCount = Math.ceil(total / 2);
                const rightCount = total - leftCount;

                const leftStartY = 20;
                const leftEndY = 80;
                for (let i = 0; i < leftCount; i++) {
                    const t = leftCount === 1 ? 0.5 : i / (leftCount - 1);
                    const y = leftStartY + t * (leftEndY - leftStartY);
                    positions[unassigned[i]] = { x: -5, y };
                }

                const rightStartY = 20;
                const rightEndY = 80;
                for (let i = 0; i < rightCount; i++) {
                    const t = rightCount === 1 ? 0.5 : i / (rightCount - 1);
                    const y = rightStartY + t * (rightEndY - rightStartY);
                    positions[unassigned[leftCount + i]] = { x: 105, y };
                }
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

export default function GameTable() {
    const players = useGameStore(s => s.players);
    const gamePhase = useGameStore(s => s.gamePhase);
    const showCards = useGameStore(s => s.showCards);
    const config = useGameStore(s => s.config);
    const activePlayerIndex = useGameStore(s => s.activePlayerIndex);
    const aiBettingInProgress = useGameStore(s => s.aiBettingInProgress);
    const isSpectating = useGameStore(s => s.isSpectating);
    const humanBetConfirmed = useGameStore(s => s.humanBetConfirmed);
    const latestAiEvents = useGameStore(s => s.latestAiEvents);
    const placeBet = useGameStore(s => s.placeBet);
    const confirmBet = useGameStore(s => s.confirmBet);
    const playerDraw = useGameStore(s => s.playerDraw);
    const playerStay = useGameStore(s => s.playerStay);
    const nextRound = useGameStore(s => s.nextRound);
    const resetGame = useGameStore(s => s.resetGame);
    const addChips = useGameStore(s => s.addChips);

    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiEvents, setEmojiEvents] = useState<FloatingEmojiEvent[]>([]);
    const timeoutsRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        if (gamePhase !== 'ROUND_END') return;
        const timerId = window.setTimeout(() => {
            nextRound();
        }, 2950);
        return () => window.clearTimeout(timerId);
    }, [gamePhase, nextRound]);

    const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
        const id = window.setTimeout(() => {
            timeoutsRef.current.delete(id);
            fn();
        }, ms);
        timeoutsRef.current.add(id);
        return id;
    }, []);

    useEffect(() => {
        const timeouts = timeoutsRef.current;
        return () => {
            timeouts.forEach(id => window.clearTimeout(id));
            timeouts.clear();
        };
    }, []);
    
    const [graphicQuality, setGraphicQuality] = useState('HIGH');
    useEffect(() => {
        setGraphicQuality(loadSettings().graphicQuality);
        const handleSettings = () => setGraphicQuality(loadSettings().graphicQuality);
        window.addEventListener('settings_changed', handleSettings);
        return () => window.removeEventListener('settings_changed', handleSettings);
    }, []);

    const humanPlayer = players.find(p => p.isHuman);
    const humanIndex = players.findIndex(p => p.isHuman);
    const humanIsDealer = humanPlayer?.isDealer ?? false;

    // Use maxSeats for stable positioning — players at fixed seatIndex positions
    const activePlayers = useMemo(
        () => (isSpectating ? players.filter(p => !p.isHuman) : players),
        [isSpectating, players],
    );
    const seatPositions = useMemo(
        () =>
            activePlayers.length > 0
                ? computeSeatPositions(activePlayers.length, activePlayers.findIndex(p => p.isDealer), activePlayers.findIndex(p => p.isHuman))
                : [],
        [activePlayers],
    );
    const totalCardsDealt = useMemo(
        () => players.reduce((sum, p) => sum + p.cards.length, 0),
        [players],
    );

    const isHumanTurn = !isSpectating && gamePhase === 'PLAYER_ACTION' && activePlayerIndex === humanIndex && humanPlayer && !humanPlayer.hasActed;
    const totalPot = useMemo(() => activePlayers.reduce((sum, p) => sum + p.bet, 0), [activePlayers]);

    // Check if game is in progress (bet placed or past betting phase)
    const humanBet = humanPlayer?.bet ?? 0;
    const isHumanDealer = humanPlayer?.isDealer ?? false;
    // Dealer penalty: total pot (all bets already placed before dealing)
    const dealerPenalty = isHumanDealer && gamePhase !== 'BETTING' && config
        ? Math.min(totalPot, humanPlayer?.chips ?? 0)
        : 0;
    const exitCost = isHumanDealer ? dealerPenalty : humanBet;
    const isGameInProgress = exitCost > 0 || (gamePhase !== 'BETTING' && !isSpectating);

    const handleExit = () => {
        if (isGameInProgress) {
            SFX.navigate();
            setShowExitConfirm(true);
        } else {
            SFX.navigate();
            resetGame();
        }
    };

    const handleBetSelect = (amount: number) => {
        if (humanPlayer && config && amount <= (humanPlayer.chips + (humanPlayer.bet ?? 0))) {
            placeBet(amount);
        }
    };

    const handleBetConfirm = () => {
        confirmBet();
    };

    const tableRef = useRef<HTMLDivElement>(null);



    const emojiEventsRef = useRef(emojiEvents);
    useEffect(() => {
        emojiEventsRef.current = emojiEvents;
    }, [emojiEvents]);

    // --- Listen to Join/Leave Events ---
    useEffect(() => {
        if (!latestAiEvents || latestAiEvents.length === 0) return;

        latestAiEvents.forEach(event => {
            const delay = 400 + Math.random() * 800; // Quick reaction

            scheduleTimeout(() => {
                let context: EmojiContext | null = null;
                if (event.type === 'join') {
                    context = 'join_room';
                } else if (event.type === 'leave') {
                    // Decide if they left rich or broke
                    if (event.player.result === 'win' || event.player.result === 'draw') {
                        context = 'leave_win';
                    } else {
                        context = 'leave_lose';
                    }
                }

                if (context) {
                    const emoji = tryBotEmoji(event.player.id, context);
                    if (emoji) {
                        const newEvent: FloatingEmojiEvent = {
                            id: `ai-event-${Date.now()}-${event.player.id}`,
                            playerId: event.player.id,
                            emoji,
                            timestamp: Date.now()
                        };
                        setEmojiEvents(prev => [...prev, newEvent]);
                        scheduleTimeout(() => {
                            setEmojiEvents(prev => prev.filter(e => e.id !== newEvent.id));
                        }, 2500);
                    }
                }
            }, delay);
        });
    }, [latestAiEvents, scheduleTimeout]);



    const handleSendEmoji = useCallback((emoji: string) => {
        if (!humanPlayer) return;

        const newEvent: FloatingEmojiEvent = {
            id: `emoji-${Date.now()}`,
            playerId: humanPlayer.id,
            emoji,
            timestamp: Date.now()
        };

        setEmojiEvents(prev => [...prev, newEvent]);

        // Remove emoji after 2 seconds
        scheduleTimeout(() => {
            setEmojiEvents(prev => prev.filter(e => e.id !== newEvent.id));
        }, 2000);

        const aiPlayers = activePlayers.filter(p => !p.isHuman);
        if (aiPlayers.length === 0) return;

        // Smart contextual response: letting all AIs evaluate if they want to respond
        aiPlayers.forEach((ai) => {
            const delay = 600 + Math.random() * 2500; // Random delay per bot
            scheduleTimeout(() => {
                const aiEmoji = getContextualEmojiResponse(emoji, ai.id);
                if (aiEmoji) {
                    const aiEvent: FloatingEmojiEvent = {
                        id: `emoji-ai-${Date.now()}-${ai.id}`,
                        playerId: ai.id,
                        emoji: aiEmoji,
                        timestamp: Date.now()
                    };

                    setEmojiEvents(prev => [...prev, aiEvent]);
                    scheduleTimeout(() => {
                        setEmojiEvents(prev => prev.filter(e => e.id !== aiEvent.id));
                    }, 2000);
                }
            }, delay);
        });
    }, [humanPlayer, activePlayers, scheduleTimeout]);

    // --- Autonomous AI Emojis (Organic Engine v2) ---
    useEffect(() => {
        const { players: latestPlayers, isSpectating: spectating } = useGameStore.getState();
        const currentPlayers = spectating ? latestPlayers.filter(p => !p.isHuman) : latestPlayers;
        const aiPlayers = currentPlayers.filter(p => !p.isHuman);
        if (aiPlayers.length === 0) return;

        // Reset budgets + cooldowns at round start
        if (gamePhase === 'BETTING') {
            resetEmojiCooldowns();
        }

        // Schedule an emoji with a delay
        const schedule = (playerId: string, emoji: string, delayMs: number) => {
            if (loadSettings().graphicQuality !== 'HIGH' && Math.random() > 0.3) return; // 70% reduction in AI emojis for non-high quality
            scheduleTimeout(() => {
                const event: FloatingEmojiEvent = {
                    id: `ai-${Date.now()}-${Math.random()}`,
                    playerId,
                    emoji,
                    timestamp: Date.now()
                };
                setEmojiEvents(prev => [...prev, event]);
                scheduleTimeout(() => {
                    setEmojiEvents(prev => prev.filter(e => e.id !== event.id));
                }, 2500);
            }, delayMs);
        };

        // --- Herd Mentality: Reacting to other bots ---
        // We look at the latest emoji event. If it's from a bot, others might pile on.
        const currentEmojiEvents = emojiEventsRef.current;
        const latestEvent = currentEmojiEvents[currentEmojiEvents.length - 1];
        if (latestEvent && latestEvent.timestamp > Date.now() - 3000) {
            const isFromBot = aiPlayers.some(p => p.id === latestEvent.playerId);
            if (isFromBot) {
                // If the latest emoji was from a bot, give other bots a chance to react
                aiPlayers.forEach(bot => {
                    if (bot.id === latestEvent.playerId) return; // don't react to self

                    // Higher chance to herd if it's a troll/reactionary context
                    if (Math.random() < 0.3) {
                        const emoji = getContextualEmojiResponse(latestEvent.emoji, bot.id); // This already checks traits inside
                        if (emoji) {
                            schedule(bot.id, emoji, 800 + Math.random() * 2000);
                        }
                    }
                });
            }
        }

        const dealer = currentPlayers.find(p => p.isDealer);

        // === BETTING: maybe one bot greets or yawns ===
        if (gamePhase === 'BETTING') {
            const bot = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
            const emoji = tryBotEmoji(bot.id, 'waiting');
            if (emoji) schedule(bot.id, emoji, 1500 + Math.random() * 3000);
        }
        // === DEALING: one random bot reacts to suspense ===
        else if (gamePhase === 'DEALING') {
            const bot = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
            const emoji = tryBotEmoji(bot.id, 'dealing');
            if (emoji) schedule(bot.id, emoji, 800 + Math.random() * 2000);
        }
        // === PLAYER_ACTION: bots react to own hand + social ===
        else if (gamePhase === 'PLAYER_ACTION') {
            // Each bot reacts to their OWN hand
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

            // Social: other bots react to someone getting Pok
            const pokPlayers = currentPlayers.filter(p => p.hasPok);
            if (pokPlayers.length > 0) {
                aiPlayers.forEach(bot => {
                    if (bot.hasPok) return; // skip the one who got it
                    const emoji = trySocialReaction(bot.id, 'see_pok');
                    if (emoji) schedule(bot.id, emoji, 800 + Math.random() * 1500);
                });
            }

            // Active bot reacts to drawing/staying decision
            const currentBot = currentPlayers[activePlayerIndex];
            if (currentBot && !currentBot.isHuman && !currentBot.hasActed) {
                const ctx: EmojiContext = currentBot.score <= 5 ? 'drawing' : 'staying';
                const emoji = tryBotEmoji(currentBot.id, ctx);
                if (emoji) schedule(currentBot.id, emoji, 400 + Math.random() * 600);
            }
        }
        // === AI_ACTION: dealer reacts ===
        else if (gamePhase === 'AI_ACTION') {
            if (dealer && !dealer.isHuman) {
                const ctx: EmojiContext = dealer.score >= 7 ? 'dealer_strong' : 'dealer_weak';
                const emoji = tryBotEmoji(dealer.id, ctx);
                if (emoji) schedule(dealer.id, emoji, 800 + Math.random() * 1000);
            }
        }
        // === ROUND_END: bots react + mood update ===
        else if (gamePhase === 'ROUND_END') {
            aiPlayers.forEach(bot => {
                // Update mood memory for next round
                const result = bot.result === 'win' ? 'win' : bot.result === 'lose' ? 'lose' : 'draw';
                updateMood(bot.id, result as 'win' | 'lose' | 'draw');

                // React to outcome
                const delay = 1000 + Math.random() * 2500;
                let ctx: EmojiContext;
                if (bot.result === 'win') ctx = 'round_win';
                else if (bot.result === 'lose') ctx = 'round_loss';
                else ctx = 'round_ok';

                const emoji = tryBotEmoji(bot.id, ctx);
                if (emoji) schedule(bot.id, emoji, delay);
            });
        }
    }, [gamePhase, activePlayerIndex, isSpectating, scheduleTimeout]);

    return (
        <div className="w-full h-full flex flex-col overflow-hidden font-sans"
            style={{ background: 'transparent' }}
        >
            {/* ===== Top Bar ===== */}
            <div className="relative flex items-center justify-between px-3 sm:px-5 py-2.5 z-50 shrink-0">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={handleExit}
                    className="text-white/70 hover:text-white text-xs sm:text-sm px-3 py-1.5 rounded-xl bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] transition-all border border-white/6"
                >
                    ← ออก
                </motion.button>

                {/* Human chip display */}
                {humanPlayer && (
                    <div
                        className="bg-[rgba(0,0,0,0.65)] px-3 py-1.5 rounded-xl border border-white/6 flex items-center gap-1.5 cursor-pointer pointer-events-auto hover:bg-[rgba(0,0,0,0.8)] transition-colors active:scale-95"
                        onClick={() => { SFX.click(); speakPhrase(`มี ${numberToThaiVoice(humanPlayer.chips)} ชิปค่ะ`); }}
                    >
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-linear-to-br from-yellow-300 to-amber-500 shadow-[0_0_6px_rgba(250,204,21,0.6)]" />
                        <span className="text-yellow-300 text-xs sm:text-sm font-bold">{formatChips(humanPlayer.chips, true)}</span>
                    </div>
                )}
            </div>

            {/* ===== Main Game Area ===== */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">

                {/* ===== TABLE (สี่เหลี่ยม) ===== */}
                <div
                    className="relative"
                    ref={tableRef} data-card-table
                    style={{
                        width: 'min(85%, 880px)',
                        height: 'min(68%, 510px)',
                    }}
                >
                    {/* Outer Wood Border */}
                    <div
                        className="absolute inset-0 rounded-3xl image-table-rail"
                        style={{
                            background: 'linear-gradient(180deg, #5c3a1e 0%, #3e2415 30%, #2a1a0e 70%, #1a0f08 100%)',
                            boxShadow: graphicQuality !== 'HIGH' ? 'none' : '0 8px 40px rgba(0,0,0,0.8), 0 2px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                            padding: '8px',
                        }}
                    >
                        {/* Gold Trim */}
                        <div
                            className="w-full h-full rounded-[18px]"
                            style={{
                                background: 'linear-gradient(180deg, rgba(255,215,100,0.18) 0%, rgba(180,140,50,0.06) 50%, rgba(255,215,100,0.14) 100%)',
                                padding: '2px',
                            }}
                        >
                            {/* Inner Wood Border */}
                            <div
                                className="w-full h-full rounded-2xl"
                                style={{
                                    background: 'linear-gradient(180deg, #4a2e18 0%, #3a2212 50%, #2a1a0e 100%)',
                                    padding: '5px',
                                }}
                            >
                                {/* ===== Felt Surface ===== */}
                                <div
                                    className="w-full h-full rounded-xl relative"
                                    style={{
                                        background: config?.room?.category === 'HIGH_STAKES' ? 'radial-gradient(ellipse at 45% 35%, #1e3a8a 0%, #172554 40%, #0a0f24 80%, #040814 100%)' :
                                            config?.room?.category === 'EXPERT' ? 'radial-gradient(ellipse at 45% 35%, #6b21a8 0%, #4c1d95 40%, #2e1065 80%, #18053a 100%)' :
                                                config?.room?.category === 'LEGENDARY' ? 'radial-gradient(ellipse at 45% 35%, #7f1d1d 0%, #450a0a 40%, #1c0505 80%, #0a0101 100%)' :
                                                    config?.room?.category === 'ULTIMATE' ? 'radial-gradient(ellipse at 45% 35%, #111827 0%, #030712 40%, #000000 80%, #000000 100%)' :
                                                    /* STANDARD */ 'radial-gradient(ellipse at 45% 35%, #2d8a4e 0%, #246e3d 20%, #1a5c2e 45%, #135026 65%, #0e3d1d 85%, #0a2e15 100%)',
                                        boxShadow: graphicQuality !== 'HIGH' ? 'none' : 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 0 120px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    <TableArtwork category={config?.room.category} />

                                    {/* ===== Central Pot Display ===== */}
                                    {totalPot > 0 && (
                                        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-2">
                                            <motion.div
                                                className="flex flex-col items-center"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                            >
                                                <div
                                                    className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full flex items-center gap-2"
                                                    style={{
                                                        background: 'linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.35))',
                                                        border: '1px solid rgba(255,215,100,0.12)',
                                                        backdropFilter: 'blur(8px)',
                                                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                                    }}
                                                >
                                                    <span className="text-yellow-500/80 text-xs">💰</span>
                                                    <span className="text-yellow-200 text-xs sm:text-sm font-bold tracking-wider">
                                                        {formatChips(totalPot)}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}

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


                                </div>
                            </div>
                        </div>
                    </div>
                    <DealingDeck dealing={gamePhase === 'DEALING'} />
                    {/* ===== Players Layer (inside table container) ===== */}
                    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible', zIndex: 20 }}>
                        {activePlayers.map((player, idx) => {
                            const pos = seatPositions[idx];
                            if (!pos) return null;

                            const isHuman = player.isHuman;
                            const isActive = activePlayerIndex === idx;
                            const isPanel = !player.isHuman;

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
                                            />

                                            {/* Floating Emoji component placed over avatar */}
                                            <div className="absolute inset-0 z-[120] pointer-events-none">
                                                <FloatingEmoji events={emojiEvents} playerId={player.id} />
                                            </div>

                                            {/* Score Badge (for AI when cards revealed) */}
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

                                    {/* AI: Tiny cards below avatar */}
                                    {isPanel && player.cards.length > 0 && (
                                        <div className="flex items-center justify-center -space-x-3 mt-0.5 z-10 scale-75 origin-top">
                                            {player.cards.map((card, ci) => (
                                                <div key={card.id} style={{ zIndex: ci }}>
                                                    <Card
                                                        card={card}
                                                        dealFromDeck={gamePhase === 'DEALING'}
                                                        faceDown={!showCards && !player.hasPok}
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
            </div>

            {/* ===== Human Turn Controls ===== */}
            <AnimatePresence>
                {isHumanTurn && (
                    <motion.div
                        className="absolute bottom-0 left-0 right-0 z-50 pointer-events-auto flex justify-center pb-4 pt-12"
                        style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
                        }}
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                    >
                        <div className="flex gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { speakPhrase('จั่ว'); playerDraw(); }}
                                className="text-white font-bold text-lg sm:text-xl px-8 sm:px-10 py-3 sm:py-3.5 rounded-2xl shadow-2xl transition-all cursor-pointer"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    borderBottom: '4px solid #047857',
                                    boxShadow: '0 6px 24px rgba(16,185,129,0.4), 0 0 40px rgba(16,185,129,0.15)',
                                }}
                            >
                                🃏 จั่วไพ่
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { speakPhrase('หยุด'); playerStay(); }}
                                className="text-white font-bold text-lg sm:text-xl px-8 sm:px-10 py-3 sm:py-3.5 rounded-2xl shadow-2xl transition-all cursor-pointer"
                                style={{
                                    background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                                    borderBottom: '4px solid #be123c',
                                    boxShadow: '0 6px 24px rgba(244,63,94,0.4), 0 0 40px rgba(244,63,94,0.15)',
                                }}
                            >
                                ✋ หยุด
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== Spectator Banner ===== */}
            <AnimatePresence>
                {isSpectating && gamePhase !== 'ROUND_END' && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
                    >
                        <div
                            className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(0,0,0,0.85), rgba(0,0,0,0.7))',
                                border: '1px solid rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(16px)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            }}
                        >
                            <div className="text-2xl">👀</div>
                            <span className="text-white font-bold text-sm">คุณกำลังดูเกม</span>
                            <span className="text-white/50 text-xs">ชิปไม่เพียงพอสำหรับห้องนี้</span>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleExit}
                                className="mt-1 px-6 py-2 rounded-xl text-white font-bold text-sm cursor-pointer"
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                    boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                                }}
                            >
                                ออกจากห้อง
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== Betting Controls ===== */}
            <AnimatePresence>
                {gamePhase === 'BETTING' && !isSpectating && humanPlayer && !humanIsDealer && config && (
                    <div className="absolute bottom-0 left-0 right-0 pb-6 pt-0 px-4 z-40 pointer-events-none flex justify-center">
                        <div className="pointer-events-auto max-w-md w-full relative">
                            <ChipSelector
                                maxBet={Math.min(humanPlayer.chips + humanPlayer.bet, config.room.maxBet)}
                                minBet={config.room.minBet}
                                totalChips={humanPlayer.chips + humanPlayer.bet}
                                currentBet={humanPlayer.bet}
                                lastBet={humanPlayer.lastBet}
                                chipPresets={config.room.chipPresets}
                                category={config.room.category}
                                onSelect={handleBetSelect}
                                onConfirm={handleBetConfirm}
                                disabled={humanBetConfirmed}
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== Dealer Deal Button ===== */}
            <AnimatePresence>
                {gamePhase === 'BETTING' && !isSpectating && humanIsDealer && (
                    <div className="absolute bottom-0 left-0 right-0 pb-6 pt-0 px-4 z-40 pointer-events-none flex justify-center">
                        <div className="pointer-events-auto max-w-md w-full relative">
                            <motion.div
                                className="glass p-4 sm:p-5 w-full mx-auto flex flex-col items-center"
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                            >
                                {aiBettingInProgress ? (
                                    <motion.button
                                        disabled
                                        className="w-full py-3 rounded-lg font-bold text-lg shadow-lg border-b-4 bg-gray-600 text-gray-300 border-gray-700 cursor-wait animate-pulse"
                                    >
                                        ⏳ รอผู้เล่นอื่น วางเดิมพัน...
                                    </motion.button>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between w-full mb-3 px-2">
                                            <p className="text-yellow-400/80 text-sm font-medium">👑 คุณคือเจ้ามือ</p>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleBetConfirm()}
                                            className="w-full py-3 rounded-lg font-bold text-lg shadow-lg border-b-4 transition-all cursor-pointer bg-gradient-to-r from-yellow-500 to-amber-600 text-black border-amber-700"
                                        >
                                            ✅ แจกไพ่
                                        </motion.button>
                                    </>
                                )}
                            </motion.div>
                        </div>
                    </div>
                )}
            </AnimatePresence>



            {/* Emoji Trigger Button */}
            {!isSpectating && humanPlayer && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowEmojiPicker(true)}
                    className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 pointer-events-auto p-3 sm:p-3.5 rounded-full bg-[rgba(0,0,0,0.7)] hover:bg-[rgba(0,0,0,0.85)] transition-all border border-white/20 flex items-center justify-center shadow-lg shadow-black/50"
                    title="ส่งอีโมจิ"
                >
                    <Smile className="w-6 h-6 sm:w-7 sm:h-7 text-white/90" />
                </motion.button>
            )}

            <EmojiPicker
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onSelect={handleSendEmoji}
            />

            {/* ===== Exit Confirmation Modal ===== */}
            <AnimatePresence>
                {showExitConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[200] flex items-center justify-center bg-[rgba(0,0,0,0.85)]"
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 20 }}
                            className="mx-4 max-w-sm w-full rounded-2xl overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, rgba(30,30,30,0.95), rgba(15,15,15,0.95))',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
                            }}
                        >
                            <div className="p-6 text-center">
                                <div className="text-4xl mb-3">⚠️</div>
                                <h3 className="text-white font-bold text-lg mb-2">ออกกลางเกม?</h3>
                                <p className="text-white/60 text-sm mb-1">
                                    {isHumanDealer
                                        ? 'เจ้ามือออกกลางเกม ต้องเสียค่ายึดโต๊ะ'
                                        : 'คุณจะเสียชิปที่วางเดิมพันไว้'}
                                </p>
                                {exitCost > 0 && (
                                    <p className="text-red-400 font-bold text-lg">
                                        -{formatChips(exitCost)} ชิป
                                    </p>
                                )}
                            </div>
                            <div className="flex border-t border-white/10">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowExitConfirm(false)}
                                    className="flex-1 py-4 text-white/70 font-bold text-sm hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    เล่นต่อ
                                </motion.button>
                                <div className="w-px bg-white/10" />
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        setShowExitConfirm(false);
                                        if (exitCost > 0) {
                                            addChips(-exitCost);
                                        }
                                        resetGame();
                                    }}
                                    className="flex-1 py-4 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors cursor-pointer"
                                >
                                    ออกเลย
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

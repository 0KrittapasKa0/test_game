import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import PlayerAvatar from './PlayerAvatar';
import ChipSelector from './ChipSelector';
import ChipStack from './ChipStack';
import RoundResultSummary from './RoundResultSummary';
import { useGameStore } from '../store/useGameStore';
import { SFX, speakPhrase } from '../utils/sound';
import { evaluateHand } from '../utils/deck';
import { formatChips } from '../utils/formatChips';
import { RoomEnvironment } from './RoomEnvironment';

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

    // Dealer: กลางด้านบน (นอกโต๊ะไกลๆ มากขึ้น)
    positions[dealerIndex] = { x: 50, y: -18 };

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

/** Animated card that flies from the deck center to a player's seat */
function FlyingCardElement({ targetX, targetY, onComplete }: {
    targetX: number;
    targetY: number;
    onComplete: () => void;
}) {
    // We use a 2-layer approach to ensure 100% 60fps hardware acceleration on iOS.
    // Animating 'left' and 'top' causes layout reflows (lag).
    // Instead, we use a 100% width/height wrapper. Animating 'x: 50%' on it moves it 50% of parent width.
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

export default function GameTable() {
    const {
        players, gamePhase,
        isDealing, showCards, config,
        activePlayerIndex, aiBettingInProgress, isSpectating, humanBetConfirmed,
        placeBet, confirmBet, playerDraw, playerStay, resetGame, addChips,
    } = useGameStore();

    const [showExitConfirm, setShowExitConfirm] = useState(false);

    const humanPlayer = players.find(p => p.isHuman);
    const humanIndex = players.findIndex(p => p.isHuman);
    const humanIsDealer = humanPlayer?.isDealer ?? false;

    // Use maxSeats for stable positioning — players at fixed seatIndex positions
    const activePlayers = isSpectating ? players.filter(p => !p.isHuman) : players;
    const seatPositions = activePlayers.length > 0
        ? computeSeatPositions(activePlayers.length, activePlayers.findIndex(p => p.isDealer), activePlayers.findIndex(p => p.isHuman))
        : [];

    const isHumanTurn = !isSpectating && gamePhase === 'PLAYER_ACTION' && activePlayerIndex === humanIndex && humanPlayer && !humanPlayer.hasActed;
    const totalPot = activePlayers.reduce((sum, p) => sum + p.bet, 0);

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

    // ── Flying card animation tracking ──
    interface FlyingCard {
        id: string;
        targetX: number; // percentage
        targetY: number; // percentage
    }
    const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
    const prevCardCountsRef = useRef<Record<string, number>>({});
    const tableRef = useRef<HTMLDivElement>(null);

    const removeFlyingCard = useCallback((id: string) => {
        setFlyingCards(prev => prev.filter(fc => fc.id !== id));
    }, []);

    // Detect new cards being dealt and spawn flying card animations
    useEffect(() => {
        if (!isDealing && gamePhase !== 'PLAYER_ACTION') {
            // Snapshot current counts so we don't re-detect existing cards later
            const snapshot: Record<string, number> = {};
            activePlayers.forEach(p => { snapshot[p.id] = p.cards.length; });
            prevCardCountsRef.current = snapshot;
            return;
        }

        const newFlyers: FlyingCard[] = [];
        activePlayers.forEach((player, idx) => {
            const prevCount = prevCardCountsRef.current[player.id] ?? 0;
            const currCount = player.cards.length;
            if (currCount > prevCount && seatPositions[idx]) {
                // New card added to this player
                for (let c = prevCount; c < currCount; c++) {
                    newFlyers.push({
                        id: `fly-${player.id}-${c}-${Date.now()}`,
                        targetX: seatPositions[idx].x,
                        targetY: seatPositions[idx].y,
                    });
                }
            }
            prevCardCountsRef.current[player.id] = currCount;
        });

        if (newFlyers.length > 0) {
            setFlyingCards(prev => [...prev, ...newFlyers]);
        }
    }, [activePlayers, isDealing, gamePhase, seatPositions]);

    return (
        <div className="w-full h-full flex flex-col overflow-hidden font-sans"
            style={{ background: 'radial-gradient(ellipse at 50% 40%, #151d15 0%, #0d1210 40%, #080c0a 100%)' }}
        >
            {/* ===== Top Bar ===== */}
            <div className="relative flex items-center justify-between px-3 sm:px-5 py-2.5 z-50 shrink-0">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExit}
                    className="text-white/70 hover:text-white text-xs sm:text-sm px-3 py-1.5 rounded-xl bg-white/6 hover:bg-white/10 transition-all backdrop-blur-sm border border-white/6"
                >
                    ← ออก
                </motion.button>



                {/* Human chip display */}
                {humanPlayer && (
                    <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/6 flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-linear-to-br from-yellow-300 to-amber-500 shadow-[0_0_6px_rgba(250,204,21,0.6)]" />
                        <span className="text-yellow-300 text-xs sm:text-sm font-bold">{formatChips(humanPlayer.chips)}</span>
                    </div>
                )}
            </div>

            {/* ===== Main Game Area ===== */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">

                {/* ===== TABLE (สี่เหลี่ยม) ===== */}
                <div
                    className="relative"
                    ref={tableRef}
                    style={{
                        width: 'min(85%, 880px)',
                        height: 'min(68%, 510px)',
                    }}
                >
                    {/* Outer Wood Border */}
                    <div
                        className="absolute inset-0 rounded-3xl"
                        style={{
                            background: 'linear-gradient(180deg, #5c3a1e 0%, #3e2415 30%, #2a1a0e 70%, #1a0f08 100%)',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.8), 0 2px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
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
                                    className="w-full h-full rounded-xl relative overflow-hidden"
                                    style={{
                                        background: config?.room?.category === 'HIGH_STAKES' ? 'radial-gradient(ellipse at 45% 35%, #1e3a8a 0%, #172554 40%, #0a0f24 80%, #040814 100%)' :
                                            config?.room?.category === 'EXPERT' ? 'radial-gradient(ellipse at 45% 35%, #6b21a8 0%, #4c1d95 40%, #2e1065 80%, #18053a 100%)' :
                                                config?.room?.category === 'LEGENDARY' ? 'radial-gradient(ellipse at 45% 35%, #7f1d1d 0%, #450a0a 40%, #1c0505 80%, #0a0101 100%)' :
                                                    config?.room?.category === 'ULTIMATE' ? 'radial-gradient(ellipse at 45% 35%, #111827 0%, #030712 40%, #000000 80%, #000000 100%)' :
                                                    /* STANDARD */ 'radial-gradient(ellipse at 45% 35%, #2d8a4e 0%, #246e3d 20%, #1a5c2e 45%, #135026 65%, #0e3d1d 85%, #0a2e15 100%)',
                                        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 0 120px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    {config?.room && <RoomEnvironment category={config.room.category} />}

                                    {/* Felt Texture */}
                                    <div
                                        className="absolute inset-0 opacity-[0.04] pointer-events-none"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
                                        }}
                                    />

                                    {/* Light highlight */}
                                    <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            background: 'radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.04) 0%, transparent 60%)',
                                        }}
                                    />

                                    {/* Inner decorative border */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div
                                            className="rounded-lg"
                                            style={{
                                                width: '88%',
                                                height: '84%',
                                                border: '1px solid rgba(255,215,100,0.06)',
                                                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.08)',
                                            }}
                                        />
                                    </div>

                                    {/* Center Logo */}
                                    {/* Center Logo */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
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

                                    {/* ===== Deck Area ===== */}
                                    <div className="absolute inset-0 flex items-center justify-center z-1 pointer-events-none">
                                        {isDealing && (
                                            <motion.div
                                                className="relative"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                            >
                                                {[2, 1, 0].map((offset) => (
                                                    <div
                                                        key={offset}
                                                        className="absolute top-0 left-0 w-12 h-17 sm:w-14 sm:h-20 rounded-lg bg-white p-[3px] sm:p-[4px]"
                                                        style={{
                                                            border: '1px solid #e5e7eb',
                                                            transform: `translate(${-offset * 1.5}px, ${-offset * 1.5}px)`,
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                        }}
                                                    >
                                                        <div className="w-full h-full rounded-[4px] border-[1.5px] border-[#e5e7eb]" />
                                                    </div>
                                                ))}
                                                <motion.div
                                                    className="w-12 h-17 sm:w-14 sm:h-20 rounded-lg shadow-xl relative z-10 bg-white p-[3px] sm:p-[4px]"
                                                    style={{
                                                        border: '1px solid #e5e7eb',
                                                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                                                    }}
                                                    animate={{ y: [0, -3, 0] }}
                                                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                                                >
                                                    <div className="w-full h-full rounded-[4px] border-[1.5px] border-[#e5e7eb] flex items-center justify-center">
                                                        <span className="text-[#e5e7eb] text-lg sm:text-xl drop-shadow-none leading-none">
                                                            ♠
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </div>

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

                                    {/* ===== Flying Card Animations ===== */}
                                    {flyingCards.map(fc => (
                                        <FlyingCardElement
                                            key={fc.id}
                                            targetX={fc.targetX}
                                            targetY={fc.targetY}
                                            onComplete={() => removeFlyingCard(fc.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
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
                                        left: `${pos.x}%`,
                                        top: `${pos.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        minWidth: '100px',
                                        zIndex: isActive ? 100 : zIndex,
                                        filter: isActive && isPanel ? 'drop-shadow(0 0 16px rgba(250,204,21,0.5))' : undefined,
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
                                            />

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
                                                        faceDown={!showCards && !player.hasPok}
                                                        delay={ci * 0.1}
                                                        small={true}
                                                        category={config?.room?.category}
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
                                                            category={config?.room?.category}
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
                            {/* Gradient Background for Visibility */}
                            <div className="absolute inset-0 -inset-x-4 bg-gradient-to-t from-black/90 to-transparent rounded-t-3xl -z-10" />

                            <ChipSelector
                                maxBet={Math.min(humanPlayer.chips + humanPlayer.bet, config.room.maxBet)}
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
                            {/* Gradient Background for Visibility */}
                            <div className="absolute inset-0 -inset-x-4 bg-gradient-to-t from-black/90 to-transparent rounded-t-3xl -z-10" />

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



            {/* ===== Round Summary Screen ===== */}
            <AnimatePresence>
                {gamePhase === 'ROUND_END' && (
                    <RoundResultSummary />
                )}
            </AnimatePresence>

            {/* ===== Exit Confirmation Modal ===== */}
            <AnimatePresence>
                {showExitConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
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

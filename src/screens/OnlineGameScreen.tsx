import { motion } from 'framer-motion';
import { useOnlineStore } from '../store/useOnlineStore';
import { useGameStore } from '../store/useGameStore';
import { RoomEnvironment } from '../components/RoomEnvironment';
import PlayerAvatar from '../components/PlayerAvatar';
import OnlineGameTable from '../components/OnlineGameTable';
import OnlineRoundResultSummary from '../components/OnlineRoundResultSummary';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SFX, speakPhrase } from '../utils/sound';
import { formatChips } from '../utils/formatChips';
import { loadProfile, saveProfile } from '../utils/storage';
import { Copy, Check } from 'lucide-react';
import ChipSelector from '../components/ChipSelector';
export default function OnlineGameScreen() {
    const {
        config, players, roomId, localPlayerId, leaveRoom, isHost, startGame,
        gamePhase, connectionStatus, isSpectating, activePlayerIndex, humanBetConfirmed, placeBet, confirmBet, playerAction
    } = useOnlineStore();
    const { setScreen } = useGameStore();

    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const playerDraw = () => playerAction('draw');
    const playerStay = () => playerAction('stay');

    const activePlayers = players.filter(p => !p.isSpectating);
    const allPlayersReady = activePlayers.every(p => p.isDealer || p.hasActed);
    useEffect(() => {
        if (!roomId || connectionStatus === 'DISCONNECTED') {
            setScreen('MENU');
        }
    }, [roomId, connectionStatus, setScreen]);

    if (!config || !roomId) return null;

    const humanIndex = players.findIndex(p => p.id === localPlayerId);
    const localPlayer = players[humanIndex];
    const isHumanDealer = localPlayer?.isDealer ?? false;
    const humanBet = localPlayer?.bet ?? 0;

    // Calculate total pot on table
    const totalPot = players.reduce((sum, p) => sum + (p.bet ?? 0), 0);

    // Dealer penalty: total pot (all bets already placed before dealing)
    const dealerPenalty = isHumanDealer && gamePhase !== 'BETTING' && gamePhase !== 'WAITING'
        ? Math.min(totalPot, localPlayer?.chips ?? 0)
        : 0;

    // Cost if you leave right now
    const exitCost = isHumanDealer ? dealerPenalty : humanBet;

    // Is game started and we are not just waiting/betting?
    const isGameInProgress = exitCost > 0 || (gamePhase !== 'BETTING' && gamePhase !== 'WAITING' && localPlayer && !isSpectating);

    // Helper to position players around the table
    const getSeatPosition = (index: number, total: number) => {
        if (total <= 1) return { left: '50%', top: '94%' }; // Alone

        // Dealer is typically seat 0
        if (index === 0) return { left: '50%', top: '-5%' };

        // Spread others across the bottom and sides
        const relativeIndex = index - 1;
        const slots = total - 1;

        // simple distribution: 3 slots = left, center, right
        if (slots === 1) return { left: '50%', top: '94%' };
        if (slots === 2) {
            return relativeIndex === 0 ? { left: '20%', top: '85%' } : { left: '80%', top: '85%' };
        }
        if (slots === 3) {
            if (relativeIndex === 0) return { left: '15%', top: '60%' };
            if (relativeIndex === 1) return { left: '50%', top: '94%' };
            return { left: '85%', top: '60%' };
        }
        if (slots === 4) {
            if (relativeIndex === 0) return { left: '10%', top: '40%' };
            if (relativeIndex === 1) return { left: '25%', top: '90%' };
            if (relativeIndex === 2) return { left: '75%', top: '90%' };
            return { left: '90%', top: '40%' };
        }

        // Fallback generic ring math for > 5 players
        const angle = Math.PI + (Math.PI / (slots + 1)) * (relativeIndex + 1);
        const radiusX = 45;
        const radiusY = 40;
        return {
            left: `${50 + radiusX * Math.cos(angle)}%`,
            top: `${50 - radiusY * Math.sin(angle)}%`
        };
    };

    const handleExitClick = () => {
        if (isSpectating || isGameInProgress) {
            SFX.navigate();
            setShowExitConfirm(true);
        } else {
            handleConfirmExit();
        }
    };

    const handleCopyId = () => {
        if (!roomId) return;
        navigator.clipboard.writeText(roomId);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleConfirmExit = () => {
        SFX.navigate();
        setShowExitConfirm(false);

        // Deduct chips if leaving mid-game
        if (!isSpectating && exitCost > 0) {
            const profile = loadProfile();
            if (profile) {
                profile.chips = Math.max(0, profile.chips - exitCost);
                saveProfile(profile);
            }
            // Optional: send a message to host that we surrendered some chips
        }

        leaveRoom();
        setScreen('MENU');
    };

    return (
        <div className="w-full h-full relative flex flex-col overflow-hidden bg-theme-standard font-sans"
            style={{ background: 'radial-gradient(ellipse at 50% 40%, #151d15 0%, #0d1210 40%, #080c0a 100%)' }}
        >
            {/* Top Bar Navigation */}
            <div className="relative flex items-center justify-between px-3 sm:px-5 py-2.5 z-50 shrink-0">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExitClick}
                    className="text-white/70 hover:text-white text-xs sm:text-sm px-3 py-1.5 rounded-xl bg-white/6 hover:bg-white/10 transition-all backdrop-blur-sm border border-white/6 cursor-pointer z-50 pointer-events-auto"
                >
                    ← ออก
                </motion.button>

                <button
                    onClick={handleCopyId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 transition-all border border-white/10 cursor-pointer pointer-events-auto group z-50"
                >
                    <span className="text-white font-bold tracking-widest uppercase text-xs sm:text-sm drop-shadow-lg">
                        ID: {roomId}
                    </span>
                    {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-white/50 group-hover:text-white/80" />}
                </button>
            </div>

            {/* Table Environment */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden w-full h-full">
                <div
                    className="relative"
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
                        <div
                            className="w-full h-full rounded-[18px]"
                            style={{
                                background: 'linear-gradient(180deg, rgba(255,215,100,0.18) 0%, rgba(180,140,50,0.06) 50%, rgba(255,215,100,0.14) 100%)',
                                padding: '2px',
                            }}
                        >
                            <div
                                className="w-full h-full rounded-2xl"
                                style={{
                                    background: 'linear-gradient(180deg, #4a2e18 0%, #3a2212 50%, #2a1a0e 100%)',
                                    padding: '5px',
                                }}
                            >
                                <div
                                    className="w-full h-full rounded-xl relative"
                                    style={{
                                        background: config.room.category === 'HIGH_STAKES' ? 'radial-gradient(ellipse at 45% 35%, #1e3a8a 0%, #172554 40%, #0a0f24 80%, #040814 100%)' :
                                            config.room.category === 'EXPERT' ? 'radial-gradient(ellipse at 45% 35%, #6b21a8 0%, #4c1d95 40%, #2e1065 80%, #18053a 100%)' :
                                                config.room.category === 'LEGENDARY' ? 'radial-gradient(ellipse at 45% 35%, #7f1d1d 0%, #450a0a 40%, #1c0505 80%, #0a0101 100%)' :
                                                    config.room.category === 'ULTIMATE' ? 'radial-gradient(ellipse at 45% 35%, #111827 0%, #030712 40%, #000000 80%, #000000 100%)' :
                                                    /* STANDARD */ 'radial-gradient(ellipse at 45% 35%, #2d8a4e 0%, #246e3d 20%, #1a5c2e 45%, #135026 65%, #0e3d1d 85%, #0a2e15 100%)',
                                        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 0 120px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    <RoomEnvironment category={config.room.category} />

                                    <div
                                        className="absolute inset-0 opacity-[0.04] pointer-events-none"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
                                        }}
                                    />

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

                                    {/* Waiting for Players Banner / Start Game */}
                                    {gamePhase === 'WAITING' && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 flex-col gap-4">
                                            {/* If game is waiting to start */}
                                            {isHost && players.filter(p => !p.isSpectating).length > 1 && players.some(p => p.isDealer) ? (
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => {
                                                        startGame();
                                                    }}
                                                    className="px-8 py-4 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold tracking-widest text-xl shadow-[0_0_30px_rgba(250,204,21,0.5)] border-2 border-yellow-300 pointer-events-auto cursor-pointer"
                                                >
                                                    เริ่มเกม
                                                </motion.button>
                                            ) : (
                                                <div className="px-6 py-3 rounded-full bg-black/50 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                                                    <span className="text-cyan-300 font-bold tracking-widest text-lg animate-pulse uppercase">
                                                        {(players.filter(p => !p.isSpectating).length < 2 || !players.some(p => p.isDealer))
                                                            ? 'รอผู้เล่นท่านอื่น หรือ เจ้ามือ...'
                                                            : 'รอเจ้ามือเริ่มเกม...'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Players Render */}
                    <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
                        {gamePhase === 'WAITING' && players.filter(p => !p.isSpectating).map((player) => (
                            <div
                                key={player.id}
                                className="absolute flex flex-col items-center pointer-events-auto"
                                style={{
                                    ...getSeatPosition(player.seatIndex, config.playerCount),
                                    transform: 'translate(-50%, -50%)',
                                    transition: 'top 0.5s ease-out, left 0.5s ease-out'
                                }}
                            >
                                <PlayerAvatar
                                    name={player.name}
                                    color={player.avatarColor}
                                    avatarUrl={player.avatarUrl}
                                    chips={player.chips}
                                    isDealer={player.isDealer}
                                    isActive={false}
                                    result={'pending'}
                                    size={60}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Active Game Table */}
                    {gamePhase !== 'WAITING' && (
                        <OnlineGameTable />
                    )}

                </div>
            </div>

            {/* ===== SIBLING CONTROLS ===== */}

            {/* Human Turn Controls */}
            <AnimatePresence>
                {!isSpectating && gamePhase === 'PLAYER_ACTION' && activePlayerIndex === humanIndex && (
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

            {/* Spectator Banner */}
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
                            <span className="text-white/50 text-xs">คุณสามารถชมเกมหรือออกจากห้องได้</span>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowExitConfirm(true)}
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

            {/* Betting Controls */}
            <AnimatePresence>
                {gamePhase === 'BETTING' && !isSpectating && humanIndex !== -1 && localPlayer && !localPlayer.isDealer && config && !humanBetConfirmed && (
                    <div className="absolute bottom-0 left-0 right-0 pb-6 pt-0 px-4 z-40 pointer-events-none flex justify-center">
                        <div className="pointer-events-auto max-w-md w-full relative">
                            <ChipSelector
                                maxBet={Math.min(localPlayer.chips + localPlayer.bet, config.room.maxBet)}
                                minBet={config.room.minBet}
                                totalChips={localPlayer.chips + localPlayer.bet}
                                currentBet={localPlayer.bet}
                                lastBet={localPlayer.lastBet}
                                chipPresets={config.room.chipPresets}
                                category={config.room.category}
                                onSelect={placeBet}
                                onConfirm={confirmBet}
                                disabled={humanBetConfirmed}
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Dealer Deal Button */}
            <AnimatePresence>
                {gamePhase === 'BETTING' && !isSpectating && humanIndex !== -1 && localPlayer?.isDealer && (
                    <div className="absolute bottom-0 left-0 right-0 pb-6 pt-0 px-4 z-40 pointer-events-none flex justify-center">
                        <div className="pointer-events-auto max-w-md w-full relative">
                            <motion.div
                                className="glass p-4 sm:p-5 w-full mx-auto flex flex-col items-center"
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                            >
                                <div className="flex items-center justify-between w-full mb-3 px-2">
                                    <p className="text-yellow-400/80 text-sm font-medium">👑 คุณคือเจ้ามือ</p>
                                </div>
                                <motion.button
                                    whileHover={allPlayersReady ? { scale: 1.02 } : {}}
                                    whileTap={allPlayersReady ? { scale: 0.98 } : {}}
                                    onClick={confirmBet}
                                    disabled={!allPlayersReady || (humanBetConfirmed && isHost)}
                                    className={`w-full py-3 rounded-lg font-bold text-lg shadow-lg border-b-4 transition-all ${!allPlayersReady
                                        ? 'bg-gray-600 text-gray-400 border-gray-700 cursor-not-allowed'
                                        : 'cursor-pointer bg-gradient-to-r from-yellow-500 to-amber-600 text-black border-amber-700 hover:from-yellow-400 hover:to-amber-500'
                                        }`}
                                >
                                    {!allPlayersReady ? 'รอผู้เล่นวางเดิมพัน...' : (humanBetConfirmed && !isHost ? 'รอโฮสต์แจกไพ่...' : '✅ แจกไพ่')}
                                </motion.button>
                            </motion.div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Round Summary Screen */}
            <AnimatePresence>
                {gamePhase === 'ROUND_END' && (
                    <OnlineRoundResultSummary />
                )}
            </AnimatePresence>

            {/* Exit Confirmation Modal */}
            <AnimatePresence>
                {showExitConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 20 }}
                            className="mx-4 max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(30,30,30,0.95), rgba(15,15,15,0.95))',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <div className="p-6 text-center">
                                <div className="text-4xl mb-3">⚠️</div>
                                <h3 className="text-white font-bold text-lg mb-2">
                                    {isSpectating ? 'แน่ใจหรือไม่?' : 'ออกกลางเกม?'}
                                </h3>
                                <p className="text-white/60 text-sm mb-1">
                                    {isSpectating
                                        ? 'คุณกำลังรับชมอยู่ ต้องการออกจากห้องใช่ไหม?'
                                        : isHumanDealer
                                            ? 'เจ้ามือออกกลางเกม ต้องเสียค่ายึดโต๊ะทั้งหมด'
                                            : 'คุณจะเสียชิปที่วางเดิมพันไว้'}
                                </p>
                                {!isSpectating && exitCost > 0 && (
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
                                    onClick={handleConfirmExit}
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

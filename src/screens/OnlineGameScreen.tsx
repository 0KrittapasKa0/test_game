import { motion } from 'framer-motion';
import { useOnlineStore } from '../store/useOnlineStore';
import { useGameStore } from '../store/useGameStore';
import { RoomEnvironment } from '../components/RoomEnvironment';
import PlayerAvatar from '../components/PlayerAvatar';
import OnlineGameTable from '../components/OnlineGameTable';
import OnlineRoundResultSummary from '../components/OnlineRoundResultSummary';
import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

export default function OnlineGameScreen() {
    const { config, players, roomId, leaveRoom, isHost, startGame, gamePhase, connectionStatus } = useOnlineStore();
    const { setScreen } = useGameStore();

    useEffect(() => {
        if (!roomId || connectionStatus === 'DISCONNECTED') {
            setScreen('MENU');
        }
    }, [roomId, connectionStatus, setScreen]);

    if (!config || !roomId) return null;

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

    const handleExit = () => {
        leaveRoom();
        setScreen('MENU');
    };

    return (
        <div className="w-full h-full relative overflow-hidden bg-theme-standard font-sans"
            style={{ background: 'radial-gradient(ellipse at 50% 40%, #151d15 0%, #0d1210 40%, #080c0a 100%)' }}
        >
            {/* Top Bar Navigation */}
            <div className="relative flex items-center justify-between px-3 sm:px-5 py-2.5 z-50 shrink-0">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExit}
                    className="text-white/70 hover:text-white text-xs sm:text-sm px-3 py-1.5 rounded-xl bg-white/6 hover:bg-white/10 transition-all backdrop-blur-sm border border-white/6 cursor-pointer"
                >
                    ← ออก
                </motion.button>

                <div className="text-white font-bold tracking-widest uppercase text-sm drop-shadow-lg">
                    [ONLINE ROOM: {roomId}]
                </div>
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
                                    className="w-full h-full rounded-xl relative overflow-hidden"
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
                                            {isHost && players.length > 1 && players.some(p => p.isDealer) ? (
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
                                                        {(players.length < 2 || !players.some(p => p.isDealer))
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
                        {gamePhase === 'WAITING' && players.map((player) => (
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

                    {/* Round Summary Screen */}
                    <AnimatePresence>
                        {gamePhase === 'ROUND_END' && (
                            <OnlineRoundResultSummary />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

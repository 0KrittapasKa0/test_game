import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, ArrowLeft, Copy, Check } from 'lucide-react';
import { useOnlineStore } from '../store/useOnlineStore';
import { useGameStore } from '../store/useGameStore';
import { loadProfile } from '../utils/storage';
import { formatChips } from '../utils/formatChips';

export default function OnlineJoinScreen() {
    const { joinRoom, leaveRoom, roomId, connectionStatus, hostRoomInfo } = useOnlineStore();
    const { setScreen, screen } = useGameStore();
    const profile = loadProfile()!;

    const [selectedRole, setSelectedRole] = useState<'player' | 'dealer' | 'spectator'>('player');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const userChips = profile?.chips || 0;
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (screen === 'ONLINE_JOIN') {
            setIsJoining(false); // Reset when entering screen
            setJoinError(null);
        }
    }, [screen]);

    const minCapital = hostRoomInfo?.config.room.dealerMinCapital || 0;
    const minBet = hostRoomInfo?.config.room.minBet || 0;

    const maxPlayers = hostRoomInfo?.config.playerCount || 5;
    const currentPlayers = hostRoomInfo?.currentPlayersCount || 1;
    const isMissingOne = currentPlayers === maxPlayers - 1;
    const noDealer = !hostRoomInfo?.hasDealer;

    // Constraint 1: If 1 slot left and no dealer, they MUST be dealer (if they have chips) or spectator
    const mustBeDealer = isMissingOne && noDealer;

    const canBeDealer = !hostRoomInfo?.hasDealer && userChips >= minCapital;

    // Player constraint: Room is not full (or room is full but we are missing a dealer and we are forced to be dealer)
    const isRoomFull = currentPlayers >= maxPlayers;
    const canBePlayer = !mustBeDealer && !isRoomFull && userChips >= minBet;

    // Auto-select valid role on constraint change
    useEffect(() => {
        if (selectedRole === 'player' && !canBePlayer) {
            setSelectedRole(canBeDealer ? 'dealer' : 'spectator');
        } else if (selectedRole === 'dealer' && !canBeDealer) {
            setSelectedRole(canBePlayer ? 'player' : 'spectator');
        }
    }, [canBePlayer, canBeDealer, selectedRole]);

    // Check if roles should be visible at all
    const showPlayerButton = !isRoomFull;
    const showDealerButton = !hostRoomInfo?.hasDealer;

    const handleCopyId = () => {
        if (!roomId) return;
        navigator.clipboard.writeText(roomId);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleJoin = async () => {
        setIsJoining(true);
        setJoinError(null);

        // This targets the connected host via the store
        const success = await joinRoom(selectedRole);

        if (success) {
            setIsJoining(false);
            setScreen('ONLINE_PLAYING');
        } else {
            setJoinError("ไม่สามารถเข้าห้องได้ (ห้องอาจเต็ม หรือถูกปฏิเสธ)");
            setIsJoining(false);
        }
    };

    const handleBack = () => {
        leaveRoom();
        setScreen('GAME_SETUP');
    };

    return (
        <div className="w-full h-full bg-casino-table flex flex-col p-4 sm:p-6 overflow-hidden relative">
            {/* Ambient Dark Vignette overlay */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />

            <motion.div
                className="w-full max-w-lg mx-auto relative z-10 flex flex-col justify-center h-full"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <div className="bg-black/60 border border-yellow-500/20 shadow-2xl rounded-3xl p-4 sm:p-6 backdrop-blur-xl relative flex flex-col w-full my-auto max-h-full overflow-y-auto custom-scrollbar">
                    {/* Top Glow Decor */}
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

                    {/* Top Action Bar */}
                    <div className="flex justify-between items-center mb-4 min-h-[40px] relative z-20 shrink-0">
                        <button
                            onClick={handleBack}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition cursor-pointer shadow-lg shrink-0"
                        >
                            <ArrowLeft size={18} />
                        </button>

                        <button
                            onClick={handleCopyId}
                            className="flex items-center gap-1.5 text-white/50 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-black/40 border border-white/5 hover:bg-black/60 hover:text-white transition cursor-pointer"
                        >
                            <span>ID: <span className="text-white">{roomId}</span></span>
                            {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="opacity-70" />}
                        </button>
                    </div>

                    <div className="flex flex-col items-center justify-center p-2 sm:p-4 w-full">

                        <h2 className="text-xl sm:text-2xl font-bold text-gold-gradient text-center tracking-widest drop-shadow-md uppercase mb-2">
                            เลือกร่วมห้อง
                        </h2>

                        {/* Capital Text */}
                        <div className="text-center mb-4 w-full flex items-center justify-center gap-2 shrink-0">
                            <span className="text-white/40 text-xs font-bold uppercase tracking-wider">ทุนของคุณ:</span>
                            <span className="text-yellow-400 font-bold tracking-wider">{formatChips(userChips)}</span>
                        </div>

                        {/* --- Room Details Card --- */}
                        <div className="w-full p-4 rounded-xl flex flex-col gap-3 text-left relative overflow-hidden border bg-black/50 border-white/10 mb-6 shadow-inner">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 border relative shadow-inner"
                                    style={{
                                        backgroundColor: (hostRoomInfo?.config.room.color || '#3b82f6') + '20',
                                        borderColor: (hostRoomInfo?.config.room.color || '#3b82f6') + '40'
                                    }}
                                >
                                    <div className="absolute inset-0 bg-white/5 rounded-xl shine-effect" />
                                    <span className="drop-shadow-lg relative z-10">{hostRoomInfo?.config.room.emoji || '🌐'}</span>
                                </div>

                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="font-bold text-sm sm:text-base leading-tight mb-0.5 text-white">
                                        {hostRoomInfo?.config.room.name || 'ไม่มีชื่อห้อง'}
                                    </p>
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-yellow-500/80 text-[11px] font-bold tracking-wider">
                                            เดิมพัน: {formatChips(hostRoomInfo?.config.room.minBet || 0)} - {formatChips(hostRoomInfo?.config.room.maxBet || 0)}
                                        </p>
                                        <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                                            <Crown size={10} className="text-yellow-500/50" />
                                            ทุนเจ้ามืออย่างน้อย {formatChips(hostRoomInfo?.config.room.dealerMinCapital || 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Extra stats */}
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-white/5">
                                <div className="flex items-center justify-between text-[11px] bg-black/30 rounded-lg p-2 border border-white/5">
                                    <span className="text-white/40 uppercase font-bold tracking-wider">ผู้เล่นในห้อง</span>
                                    <span className="text-white font-bold"><span className="text-cyan-400">{hostRoomInfo?.currentPlayersCount || 1}</span> / {hostRoomInfo?.config.playerCount}</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] bg-black/30 rounded-lg p-2 border border-white/5">
                                    <span className="text-white/40 uppercase font-bold tracking-wider">สถานะเจ้ามือ</span>
                                    <span className={`font-bold ${hostRoomInfo?.hasDealer ? 'text-red-400' : 'text-green-400'}`}>
                                        {hostRoomInfo?.hasDealer ? 'มีแล้ว' : 'ว่าง'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={`grid gap-2 sm:gap-3 w-full mb-5 relative z-10 shrink-0 ${showPlayerButton && showDealerButton ? 'grid-cols-3' : (!showPlayerButton && !showDealerButton ? 'grid-cols-1' : 'grid-cols-2')}`}>
                            {/* Role: Player */}
                            {showPlayerButton && (
                                <button
                                    onClick={() => { if (canBePlayer) setSelectedRole('player'); }}
                                    disabled={!canBePlayer}
                                    className={`p-2 sm:p-3 rounded-xl transition-all duration-200 border relative overflow-hidden flex flex-col items-center
                                        ${!canBePlayer
                                            ? 'bg-black/60 border-blue-500/10 cursor-not-allowed opacity-60 grayscale'
                                            : selectedRole === 'player'
                                                ? 'bg-gradient-to-b from-blue-900/60 to-black/80 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/50 grayscale-0 cursor-pointer'
                                                : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-black/60 grayscale cursor-pointer'}`}
                                >
                                    <div className="flex flex-col items-center gap-2 relative z-10 w-full">
                                        <div className={`p-1.5 sm:p-2.5 rounded-full ${!canBePlayer ? 'bg-blue-500/10 text-blue-500/50' : selectedRole === 'player' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/50'}`}>
                                            <Users size={20} className="sm:w-6 sm:h-6" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className={`text-xs font-bold tracking-widest uppercase mb-0.5 ${!canBePlayer ? 'text-blue-400/50' : selectedRole === 'player' ? 'text-blue-100' : 'text-white'}`}>
                                                ลูกขา
                                            </h3>
                                            <p className="text-white/40 text-[9px] uppercase font-bold tracking-wider leading-relaxed">
                                                {mustBeDealer ? 'ห้องขาดเจ้ามือ' : (userChips < minBet ? 'ทุนไม่พอ' : 'ร่วมลุ้นสู้กัน')}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {/* Role: Dealer */}
                            {showDealerButton && (
                                <button
                                    onClick={() => { if (canBeDealer) setSelectedRole('dealer'); }}
                                    disabled={!canBeDealer}
                                    className={`p-2 sm:p-3 rounded-xl transition-all duration-200 border relative overflow-hidden flex flex-col items-center
                                        ${!canBeDealer
                                            ? 'bg-black/60 border-yellow-500/10 cursor-not-allowed opacity-60 grayscale'
                                            : selectedRole === 'dealer'
                                                ? 'bg-gradient-to-b from-yellow-900/60 to-black/80 border-yellow-500/50 shadow-[0_0_20px_rgba(250,204,21,0.3)] ring-1 ring-yellow-500/50 grayscale-0 cursor-pointer'
                                                : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-black/60 grayscale cursor-pointer'}`}
                                >
                                    <div className="flex flex-col items-center gap-2 relative z-10">
                                        <div className={`p-1.5 sm:p-2.5 rounded-full ${!canBeDealer ? 'bg-yellow-500/10 text-yellow-500/50' : selectedRole === 'dealer' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/50'}`}>
                                            <Crown size={20} className="sm:w-6 sm:h-6" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${!canBeDealer ? 'text-yellow-400/50' : selectedRole === 'dealer' ? 'text-yellow-100' : 'text-white'}`}>
                                                เจ้ามือ {hostRoomInfo?.hasDealer && '(เต็ม)'}
                                            </h3>
                                            <p className="text-white/40 text-[9px] uppercase font-bold tracking-wider leading-relaxed">
                                                {hostRoomInfo?.hasDealer
                                                    ? 'มีเจ้ามือแล้ว'
                                                    : (userChips < minCapital)
                                                        ? `ทุนไม่พอ`
                                                        : 'คุมโต๊ะกินรวบ'}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {/* Role: Spectator */}
                            <button
                                onClick={() => setSelectedRole('spectator')}
                                className={`p-2 sm:p-3 rounded-xl transition-all duration-200 border relative overflow-hidden flex flex-col items-center
                                    ${selectedRole === 'spectator'
                                        ? 'bg-gradient-to-b from-gray-700/60 to-black/80 border-gray-400/50 shadow-[0_0_20px_rgba(156,163,175,0.3)] ring-1 ring-gray-400/50 grayscale-0 cursor-pointer'
                                        : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-black/60 grayscale cursor-pointer'}`}
                            >
                                <div className="flex flex-col items-center gap-2 relative z-10">
                                    <div className={`p-1.5 sm:p-2.5 rounded-full ${selectedRole === 'spectator' ? 'bg-gray-500/20 text-gray-300' : 'bg-white/5 text-white/50'}`}>
                                        <span className="text-[16px] sm:text-[20px] leading-none">👁️</span>
                                    </div>
                                    <div className="text-center">
                                        <h3 className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${selectedRole === 'spectator' ? 'text-gray-100' : 'text-white'}`}>
                                            ผู้ชม
                                        </h3>
                                        <p className="text-white/40 text-[9px] uppercase font-bold tracking-wider leading-relaxed">
                                            เข้าดูเกมฟรี
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {joinError && (
                            <div className="w-full bg-red-500/20 text-red-400 text-xs font-bold text-center px-4 py-2 rounded-lg border border-red-500/30 mb-4 animate-pulse uppercase tracking-wider">
                                {joinError}
                            </div>
                        )}

                        <button
                            onClick={handleJoin}
                            disabled={isJoining || connectionStatus !== 'CONNECTED'}
                            className={`w-full py-3.5 sm:py-4 mt-auto shrink-0 rounded-xl flex items-center justify-center gap-2 font-bold tracking-widest text-sm uppercase transition-all cursor-pointer relative overflow-hidden shadow-lg border
                                ${selectedRole === 'dealer'
                                    ? 'bg-gradient-to-b from-yellow-500 to-yellow-700 text-black shadow-yellow-900/50 border-yellow-400 hover:shadow-yellow-500/40'
                                    : 'bg-gradient-to-b from-blue-600 to-blue-800 text-blue-50 shadow-blue-900/50 border-blue-400 hover:shadow-blue-500/40'}`}
                        >
                            <div className="absolute inset-0 bg-white/10 pointer-events-none" />
                            {isJoining ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>กำลังเข้าร่วม...</span>
                                </>
                            ) : (
                                <span>เริ่ม{selectedRole === 'spectator' ? 'ดู' : 'เล่น'}เป็น {selectedRole === 'dealer' ? 'เจ้ามือ' : selectedRole === 'player' ? 'ลูกขา' : 'ผู้ชม'}</span>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

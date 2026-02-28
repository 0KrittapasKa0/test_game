import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, ArrowLeft } from 'lucide-react';
import { useOnlineStore } from '../store/useOnlineStore';
import { useGameStore } from '../store/useGameStore';
import { loadProfile } from '../utils/storage';

export default function OnlineJoinScreen() {
    const { joinRoom, leaveRoom, roomId, connectionStatus, hostRoomInfo } = useOnlineStore();
    const { setScreen } = useGameStore();

    const [selectedRole, setSelectedRole] = useState<'player' | 'dealer'>('player');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [userChips, setUserChips] = useState(0);

    useEffect(() => {
        const profile = loadProfile();
        if (profile) setUserChips(profile.chips);
    }, []);

    const minCapital = hostRoomInfo?.config.room.dealerMinCapital || 0;
    const canBeDealer = !hostRoomInfo?.hasDealer && userChips >= minCapital;

    const handleJoin = async () => {
        setIsJoining(true);
        setJoinError(null);

        // This targets the connected host via the store
        const success = await joinRoom(selectedRole);

        if (success) {
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
                className="w-full max-w-lg mx-auto relative z-10 flex flex-col h-full"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <div className="bg-black/60 border border-yellow-500/20 shadow-2xl rounded-3xl p-5 sm:p-7 backdrop-blur-xl relative overflow-hidden flex flex-col flex-1">
                    {/* Top Glow Decor */}
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

                    {/* Top Action Bar */}
                    <div className="flex justify-between items-center mb-6 min-h-[40px] relative z-20">
                        <button
                            onClick={handleBack}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition cursor-pointer shadow-lg shrink-0"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="text-white/50 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-black/40 border border-white/5">
                            ID: <span className="text-white">{roomId}</span>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full h-full">

                        <h2 className="text-xl sm:text-2xl font-bold text-gold-gradient text-center tracking-widest drop-shadow-md uppercase mb-2">
                            เลือกร่วมห้อง
                        </h2>

                        {/* Capital Text */}
                        <div className="text-center mb-6 w-full flex items-center justify-center gap-2">
                            <span className="text-white/40 text-xs font-bold uppercase tracking-wider">ทุนของคุณ:</span>
                            <span className="text-yellow-400 font-bold tracking-wider">{userChips.toLocaleString()} ชิป</span>
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
                                            เดิมพัน: {hostRoomInfo?.config.room.minBet} - {hostRoomInfo?.config.room.maxBet}
                                        </p>
                                        <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                                            <Crown size={10} className="text-yellow-500/50" />
                                            ทุนเจ้ามืออย่างน้อย {hostRoomInfo?.config.room.dealerMinCapital.toLocaleString()}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-6 relative z-10">
                            {/* Role: Player */}
                            <button
                                onClick={() => setSelectedRole('player')}
                                className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border relative overflow-hidden
                                    ${selectedRole === 'player'
                                        ? 'bg-gradient-to-b from-blue-900/60 to-black/80 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/50 grayscale-0'
                                        : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-black/60 grayscale'}`}
                            >
                                <div className="flex flex-col items-center gap-3 relative z-10 w-full">
                                    <div className={`p-3 rounded-full ${selectedRole === 'player' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/50'}`}>
                                        <Users size={28} />
                                    </div>
                                    <div className="text-center">
                                        <h3 className={`text-sm font-bold tracking-widest uppercase mb-1 ${selectedRole === 'player' ? 'text-blue-100' : 'text-white'}`}>
                                            ลูกขา
                                        </h3>
                                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider leading-relaxed">
                                            ร่วมสนุกลุ้นสู้กัน
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Role: Dealer */}
                            <button
                                onClick={() => {
                                    if (canBeDealer) {
                                        setSelectedRole('dealer');
                                    }
                                }}
                                disabled={!canBeDealer}
                                className={`p-4 rounded-xl transition-all duration-300 border relative overflow-hidden
                                    ${!canBeDealer
                                        ? 'bg-black/60 border-red-500/10 cursor-not-allowed opacity-60 grayscale'
                                        : selectedRole === 'dealer'
                                            ? 'bg-gradient-to-b from-yellow-900/60 to-black/80 border-yellow-500/50 shadow-[0_0_20px_rgba(250,204,21,0.3)] ring-1 ring-yellow-500/50 grayscale-0 cursor-pointer'
                                            : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-black/60 grayscale cursor-pointer'}`}
                            >
                                <div className="flex flex-col items-center gap-3 relative z-10">
                                    <div className={`p-3 rounded-full ${!canBeDealer ? 'bg-red-500/10 text-red-500/50' : selectedRole === 'dealer' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/50'}`}>
                                        <Crown size={28} />
                                    </div>
                                    <div className="text-center">
                                        <h3 className={`text-sm font-bold uppercase tracking-widest mb-1 ${!canBeDealer ? 'text-red-400/50' : selectedRole === 'dealer' ? 'text-yellow-100' : 'text-white'}`}>
                                            เจ้ามือ {hostRoomInfo?.hasDealer && '(เต็ม)'}
                                        </h3>
                                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider leading-relaxed">
                                            {hostRoomInfo?.hasDealer
                                                ? 'มีเจ้ามือแล้ว'
                                                : (userChips < minCapital)
                                                    ? `ทุนไม่พอ`
                                                    : 'คุมโต๊ะกินรอบวง'}
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
                            className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold tracking-widest text-sm uppercase transition-all cursor-pointer relative overflow-hidden shadow-lg border
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
                                <span>เริ่มเล่นเป็น {selectedRole === 'dealer' ? 'เจ้ามือ' : 'ลูกขา'}</span>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

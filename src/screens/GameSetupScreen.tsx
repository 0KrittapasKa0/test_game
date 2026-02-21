import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Crown, ChevronRight, Lock } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { loadProfile, loadSettings } from '../utils/storage';
import { formatChips } from '../utils/formatChips';
import { ROOMS } from '../types/game';
import type { RoomConfig } from '../types/game';
import { SFX } from '../utils/sound';

export default function GameSetupScreen() {
    const { setScreen, initGame } = useGameStore();
    const profile = loadProfile()!;
    const settings = loadSettings();

    const [step, setStep] = useState<'room' | 'config'>('room');
    const [selectedRoom, setSelectedRoom] = useState<RoomConfig>(
        ROOMS.find(r => r.id === settings.lastRoomId) || ROOMS[1]
    );
    const [playerCount, setPlayerCount] = useState(settings.lastPlayerCount);
    const [humanIsDealer, setHumanIsDealer] = useState(settings.lastHumanIsDealer);

    const canBeDealer = profile.chips >= selectedRoom.dealerMinCapital;

    const [selectedCategory, setSelectedCategory] = useState<'STANDARD' | 'VIP' | 'LEGENDARY' | 'MYTHICAL'>('STANDARD');

    const handleSelectRoom = (room: RoomConfig) => {
        SFX.click();
        setSelectedRoom(room);
        setHumanIsDealer(false);
        setStep('config');
    };

    const handleStart = () => {
        SFX.betConfirm();
        const finalDealer = canBeDealer ? humanIsDealer : false;
        initGame({
            playerCount,
            humanIsDealer: finalDealer,
            room: selectedRoom,
        });
    };

    const handleQuickStart = () => {
        SFX.betConfirm();
        // Pick a random affordable room
        const affordableRooms = ROOMS.filter(r => profile.chips >= r.minBet);
        if (affordableRooms.length === 0) return;
        const randomRoom = affordableRooms[Math.floor(Math.random() * affordableRooms.length)];
        // Random player count 3-10
        const randomPlayers = 3 + Math.floor(Math.random() * 8);
        // Random dealer (only if affordable)
        const canDeal = profile.chips >= randomRoom.dealerMinCapital;
        const randomDealer = canDeal && Math.random() < 0.3; // 30% chance to be dealer
        initGame({
            playerCount: randomPlayers,
            humanIsDealer: randomDealer,
            room: randomRoom,
        });
    };

    return (
        <div className="w-full h-full bg-casino-table flex items-center justify-center p-4 sm:p-6 overflow-y-auto relative">
            {/* Ambient Dark Vignette overlay */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />

            <motion.div
                className="w-full max-w-sm relative z-10"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <div className="bg-black/60 border border-yellow-500/20 shadow-2xl rounded-3xl p-5 sm:p-7 backdrop-blur-xl relative overflow-hidden">
                    {/* Top Glow Decor */}
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

                    {/* Back Button */}
                    <button
                        onClick={() => {
                            if (step === 'config') {
                                setStep('room');
                            } else {
                                setScreen('MENU');
                            }
                        }}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition cursor-pointer shadow-lg mb-4 absolute top-4 left-4 z-20"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    {/* Spacer for absolute button */}
                    <div className="h-4" />

                    <AnimatePresence mode="wait">
                        {/* ===== STEP 1: Room Selection ===== */}
                        {step === 'room' && (
                            <motion.div
                                key="room"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="mt-6"
                            >
                                <h2 className="text-xl sm:text-2xl font-bold text-gold-gradient text-center tracking-widest drop-shadow-md uppercase mb-1">
                                    เลือกโต๊ะ
                                </h2>

                                {/* Centered Capital Text Without Background or Icon */}
                                <div className="text-center mb-6 w-full">
                                    <span className="text-white/40 text-xs font-bold uppercase tracking-wider mr-2">ทุนของคุณ:</span>
                                    <span className="text-yellow-400 font-bold tracking-wider">{formatChips(profile.chips)}</span>
                                </div>

                                {/* Category Tabs */}
                                <div className="flex p-1 bg-black/40 border border-white/5 rounded-2xl mb-5 gap-1 overflow-x-auto shadow-inner">
                                    {([
                                        { key: 'STANDARD', label: 'ทั่วไป', style: 'text-white/70 hover:text-white hover:bg-white/10', activeStyle: 'bg-white/15 text-white font-bold shadow-md' },
                                        { key: 'VIP', label: 'VIP 👑', style: 'text-yellow-500/60 hover:text-yellow-400 hover:bg-yellow-500/10', activeStyle: 'bg-gradient-to-b from-yellow-500/30 to-amber-600/10 text-yellow-400 border border-yellow-500/20 shadow-[0_0_10px_rgba(250,204,21,0.15)] font-bold' },
                                        { key: 'LEGENDARY', label: 'ตำนาน 🐉', style: 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10', activeStyle: 'bg-gradient-to-b from-red-600/30 to-orange-600/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)] font-bold' },
                                        { key: 'MYTHICAL', label: 'เทพ 🌌', style: 'text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10', activeStyle: 'bg-gradient-to-b from-purple-600/30 to-cyan-500/10 text-purple-300 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)] font-bold' },
                                    ] as const).map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setSelectedCategory(tab.key)}
                                            className={`flex-1 py-2.5 text-xs sm:text-sm rounded-xl transition-all whitespace-nowrap px-2
                                                ${selectedCategory === tab.key ? tab.activeStyle : tab.style}
                                            `}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Room Selection List */}
                                <div className="space-y-3 mb-6 max-h-[360px] overflow-y-auto no-scrollbar pr-1">
                                    {ROOMS.filter(r => r.category === selectedCategory).map((room) => {
                                        const affordable = profile.chips >= room.minBet;
                                        return (
                                            <motion.button
                                                key={room.id}
                                                whileTap={affordable ? { scale: 0.96 } : {}}
                                                onClick={() => affordable && handleSelectRoom(room)}
                                                disabled={!affordable}
                                                className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left transition-all cursor-pointer relative overflow-hidden border group
                                                    ${affordable
                                                        ? 'bg-black/50 border-white/10 hover:border-yellow-500/30 hover:bg-black/70 shadow-lg hover:shadow-[0_0_15px_rgba(250,204,21,0.1)]'
                                                        : 'bg-black/30 border-white/5 opacity-50 cursor-not-allowed grayscale'}`}
                                            >
                                                {affordable && (
                                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                )}

                                                {/* Left Icon Panel */}
                                                <div
                                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 border relative shadow-inner"
                                                    style={{
                                                        backgroundColor: room.color + (affordable ? '20' : '10'),
                                                        borderColor: room.color + (affordable ? '40' : '20')
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-white/5 rounded-2xl shine-effect" />
                                                    <span className="drop-shadow-lg relative z-10">{room.emoji}</span>
                                                </div>

                                                {/* Room Info */}
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className={`font-bold text-lg leading-tight mb-1 ${affordable ? 'text-white' : 'text-white/50'}`}>
                                                        {room.name}
                                                    </p>
                                                    <div className="flex flex-col gap-0.5">
                                                        <p className="text-yellow-500/80 text-[11px] font-bold tracking-wider">
                                                            เดิมพัน: {formatChips(room.minBet)} - {formatChips(room.maxBet)}
                                                        </p>
                                                        <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                                                            <Crown size={10} className="text-yellow-500/50" />
                                                            ทุนเจ้ามือ ≥ {formatChips(room.dealerMinCapital)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Status Icon */}
                                                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-black/40 border border-white/5 group-hover:bg-yellow-500/20 group-hover:border-yellow-500/30 transition-colors">
                                                    {affordable
                                                        ? <ChevronRight size={16} className="text-yellow-500/70 group-hover:text-yellow-400" />
                                                        : <Lock size={14} className="text-red-400/50" />}
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                {/* Quick Start Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={handleQuickStart}
                                    className="w-full py-4 rounded-2xl text-black font-bold text-lg tracking-widest cursor-pointer transition-all relative overflow-hidden bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 border border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] uppercase"
                                >
                                    <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity" />
                                    <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
                                        <span className="text-2xl">🎲</span> เข้าโต๊ะอัตโนมัติ
                                    </span>
                                </motion.button>
                            </motion.div>
                        )}


                        {/* ===== STEP 2: Game Config ===== */}
                        {step === 'config' && (
                            <motion.div
                                key="config"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="mt-6"
                            >
                                <h3 className="text-center font-bold text-white/50 text-xs tracking-widest uppercase mb-4">
                                    ตั้งค่าโต๊ะ
                                </h3>

                                {/* Room Badge */}
                                <div
                                    className="flex items-center gap-3 p-3 rounded-2xl mb-6 bg-black/50 border border-yellow-500/20 shadow-inner group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none" />
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl shrink-0 bg-black/40 shadow-inner" style={{ border: `1px solid ${selectedRoom.color}40` }}>
                                        {selectedRoom.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0 z-10">
                                        <div className="text-yellow-500/70 text-[10px] font-bold tracking-widest uppercase mb-0.5">{selectedRoom.category} ROOM</div>
                                        <p className="text-white font-bold text-base leading-tight drop-shadow-md">{selectedRoom.name}</p>
                                        <p className="text-white/50 text-[11px] tracking-wider mt-0.5">
                                            {formatChips(selectedRoom.minBet)} - {formatChips(selectedRoom.maxBet)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setStep('room')}
                                        className="text-white/40 hover:text-white text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer font-bold transition-colors z-10"
                                    >
                                        เปลี่ยน
                                    </button>
                                </div>

                                {/* Player Count */}
                                <div className="mb-6 bg-black/40 p-4 rounded-2xl border border-white/5">
                                    <label className="flex items-center gap-2 text-xs text-white/60 font-bold uppercase tracking-widest mb-3">
                                        <Users size={16} className="text-blue-400" />
                                        จำนวนขาไพ่ในวง
                                    </label>
                                    <div className="grid grid-cols-5 gap-2 justify-center">
                                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                            <motion.button
                                                key={n}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => { SFX.click(); setPlayerCount(n); }}
                                                className={`h-12 rounded-xl text-lg font-bold transition-all cursor-pointer border relative overflow-hidden
                                                    ${playerCount === n
                                                        ? 'bg-gradient-to-b from-yellow-500 to-amber-600 text-black border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)] scale-105 z-10'
                                                        : 'bg-black/50 text-white/40 border-white/10 hover:border-white/20 hover:bg-white/5 hover:text-white/80'}`}
                                            >
                                                {playerCount === n && <div className="absolute inset-0 bg-white/20" />}
                                                <span className="relative z-10">{n}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between mt-3 px-1">
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                        <span className="text-white/30 text-[10px] uppercase tracking-widest px-2 font-bold">
                                            ขนาดโต๊ะ {playerCount} ที่นั่ง
                                        </span>
                                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                    </div>
                                </div>

                                {/* Dealer Position Context */}
                                <div className="mb-8">
                                    <label className="flex items-center gap-2 text-xs text-white/60 font-bold uppercase tracking-widest mb-3 px-1">
                                        <Crown size={16} className="text-yellow-400" />
                                        ระบุบทบาทของคุณ
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Dealer Option */}
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => { if (canBeDealer) { SFX.click(); setHumanIsDealer(true); } }}
                                            disabled={!canBeDealer}
                                            className={`p-4 rounded-2xl text-sm transition-all cursor-pointer relative flex flex-col items-center justify-center gap-2 border overflow-hidden
                                                ${humanIsDealer
                                                    ? 'bg-gradient-to-b from-yellow-600/20 to-amber-900/40 border-yellow-500 text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]'
                                                    : canBeDealer
                                                        ? 'bg-black/50 text-white/50 border-white/10 hover:border-white/30 hover:bg-white/5 hover:text-white'
                                                        : 'bg-black/80 text-white/20 border-white/5 cursor-not-allowed grayscale'}`}
                                        >
                                            {humanIsDealer && <div className="absolute inset-x-0 top-0 h-0.5 bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,1)]" />}
                                            <div className="flex flex-col items-center">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${humanIsDealer ? 'bg-yellow-500/20' : 'bg-black/40'}`}>
                                                    <Crown size={20} className={humanIsDealer ? 'text-yellow-400 drop-shadow-md' : (canBeDealer ? 'text-white/50' : 'text-white/20')} />
                                                </div>
                                                <span className={`font-bold tracking-wider ${humanIsDealer ? 'text-yellow-400' : ''}`}>เป็นเจ้ามือ</span>
                                            </div>

                                            {canBeDealer ? (
                                                <span className={`text-[10px] ${humanIsDealer ? 'text-yellow-500/80 font-bold' : 'text-white/30'} flex-1 flex items-end mt-1`}>กินเรียบ/จ่ายรอบวง!</span>
                                            ) : (
                                                <div className="flex flex-col items-center justify-end flex-1 w-full mt-1">
                                                    <div className="flex items-center gap-1 text-[9px] text-red-500/80 font-bold bg-red-950/50 px-2 py-0.5 rounded-full border border-red-500/20 truncate w-full justify-center">
                                                        <Lock size={10} className="shrink-0" />
                                                        <span className="truncate">ทุนขั้นต่ำ {formatChips(selectedRoom.dealerMinCapital)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.button>

                                        {/* Player Option */}
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => { SFX.click(); setHumanIsDealer(false); }}
                                            className={`p-4 rounded-2xl text-sm transition-all cursor-pointer flex flex-col items-center justify-center gap-2 border overflow-hidden relative
                                                ${!humanIsDealer
                                                    ? 'bg-gradient-to-b from-blue-600/20 to-cyan-900/40 border-blue-400 text-blue-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                                                    : 'bg-black/50 text-white/50 border-white/10 hover:border-white/30 hover:bg-white/5 hover:text-white'}`}
                                        >
                                            {!humanIsDealer && <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-400 shadow-[0_0_8px_rgba(56,189,248,1)]" />}
                                            <div className="flex flex-col items-center">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${!humanIsDealer ? 'bg-blue-500/20' : 'bg-black/40'}`}>
                                                    <Users size={20} className={!humanIsDealer ? 'text-blue-400 drop-shadow-md' : 'text-white/50'} />
                                                </div>
                                                <span className={`font-bold tracking-wider ${!humanIsDealer ? 'text-blue-400' : ''}`}>เป็นลูกขา</span>
                                            </div>
                                            <span className={`text-[10px] mt-1 ${!humanIsDealer ? 'text-blue-400/80 font-bold' : 'text-white/30'}`}>ลุ้นไพ่สวยๆ แทงสบายๆ</span>
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Action Bar */}
                                <div className="pt-2 border-t border-white/5 mt-auto">
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <span className="text-white/40 text-xs font-bold uppercase tracking-widest">ยอดชิปคงเหลือ:</span>
                                        <span className="text-yellow-400 font-bold text-lg drop-shadow-md">{formatChips(profile.chips)}</span>
                                    </div>

                                    {/* Start Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleStart}
                                        disabled={profile.chips < selectedRoom.minBet && !humanIsDealer}
                                        className="btn-gold w-full text-xl py-4 flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                    >
                                        🚪 เข้าสู่โต๊ะ
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

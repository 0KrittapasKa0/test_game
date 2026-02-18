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
        <div className="w-full h-full page-bg flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
                className="glass w-full max-w-sm p-5 sm:p-7"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                {/* Back */}
                <button
                    onClick={() => {
                        if (step === 'config') {
                            setStep('room');
                        } else {
                            setScreen('MENU');
                        }
                    }}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-white mb-4 transition cursor-pointer text-sm"
                >
                    <ArrowLeft size={18} />
                    กลับ
                </button>

                <AnimatePresence mode="wait">
                    {/* ===== STEP 1: Room Selection ===== */}
                    {step === 'room' && (
                        <motion.div
                            key="room"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 text-center mb-1">
                                🏠 เลือกห้อง
                            </h2>
                            <p className="text-gray-500 text-xs text-center mb-4">
                                ชิปของคุณ: <span className="text-yellow-300 font-bold">{formatChips(profile.chips)}</span>
                            </p>

                            {/* Category Tabs */}
                            <div className="flex p-1 bg-white/5 rounded-xl mb-4 gap-0.5 overflow-x-auto">
                                {([
                                    { key: 'STANDARD', label: 'ทั่วไป', style: 'bg-white/10 text-white' },
                                    { key: 'VIP', label: 'VIP 👑', style: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border border-yellow-500/10' },
                                    { key: 'LEGENDARY', label: 'ตำนาน 🐉', style: 'bg-gradient-to-r from-red-600/20 to-orange-500/20 text-red-400 border border-red-500/10' },
                                    { key: 'MYTHICAL', label: 'เทพ 🌌', style: 'bg-gradient-to-r from-purple-600/20 to-cyan-500/20 text-purple-300 border border-purple-500/10' },
                                ] as const).map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setSelectedCategory(tab.key)}
                                        className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap px-2 ${selectedCategory === tab.key
                                            ? `${tab.style} shadow-sm`
                                            : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2.5 mb-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                {ROOMS.filter(r => r.category === selectedCategory).map((room) => {
                                    const affordable = profile.chips >= room.minBet;
                                    return (
                                        <motion.button
                                            key={room.id}
                                            whileTap={affordable ? { scale: 0.97 } : {}}
                                            onClick={() => affordable && handleSelectRoom(room)}
                                            disabled={!affordable}
                                            className={`w-full p-3.5 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer relative overflow-hidden
                                                ${affordable
                                                    ? 'bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/15'
                                                    : 'bg-white/[0.02] border border-white/5 opacity-40 cursor-not-allowed'}`}
                                        >
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                                                style={{ backgroundColor: room.color + '20' }}
                                            >
                                                {room.emoji}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-semibold text-base leading-tight">{room.name}</p>
                                                <p className="text-gray-500 text-xs mt-0.5">
                                                    เดิมพัน {formatChips(room.minBet)} - {formatChips(room.maxBet)}
                                                </p>
                                                <p className="text-gray-600 text-[10px]">
                                                    เจ้ามือ ≥ {formatChips(room.dealerMinCapital)}
                                                </p>
                                            </div>
                                            <div className="shrink-0">
                                                {affordable
                                                    ? <ChevronRight size={20} className="text-gray-600" />
                                                    : <Lock size={16} className="text-gray-600" />}
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Quick Start Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleQuickStart}
                                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all relative overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
                                    boxShadow: '0 4px 20px rgba(139,92,246,0.35)',
                                }}
                            >
                                <span className="relative z-10">🎲 เริ่มเกมด่วน</span>
                                <div
                                    className="absolute inset-0 opacity-30"
                                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }}
                                />
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
                        >
                            {/* Room Badge */}
                            <div
                                className="flex items-center gap-2 p-2.5 rounded-xl mb-4 bg-white/[0.04] border border-white/6"
                            >
                                <span className="text-xl">{selectedRoom.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-sm leading-tight">{selectedRoom.name}</p>
                                    <p className="text-gray-500 text-[11px]">
                                        เดิมพัน {selectedRoom.minBet} - {selectedRoom.maxBet} ชิป
                                    </p>
                                </div>
                                <button
                                    onClick={() => setStep('room')}
                                    className="text-gray-500 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/5 cursor-pointer"
                                >
                                    เปลี่ยน
                                </button>
                            </div>

                            {/* Player Count */}
                            <div className="mb-5">
                                <label className="flex items-center gap-2 text-sm text-gray-400 font-medium mb-2">
                                    <Users size={16} className="text-blue-400" />
                                    จำนวนขาไพ่ในวง
                                </label>
                                <div className="grid grid-cols-5 gap-2 justify-center">
                                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                        <motion.button
                                            key={n}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => { SFX.click(); setPlayerCount(n); }}
                                            className={`h-10 sm:h-12 rounded-xl text-lg font-bold transition-all cursor-pointer
                                                ${playerCount === n
                                                    ? 'bg-gradient-to-b from-yellow-400 to-amber-500 text-black shadow-lg shadow-amber-500/20 scale-105'
                                                    : 'bg-white/5 text-gray-300 border border-white/8 hover:bg-white/10'}`}
                                        >
                                            {n}
                                        </motion.button>
                                    ))}
                                </div>
                                <p className="text-gray-600 text-center text-xs mt-1">
                                    ขนาดโต๊ะ {playerCount} ที่นั่ง
                                </p>
                            </div>

                            {/* Dealer */}
                            <div className="mb-5">
                                <label className="flex items-center gap-2 text-sm text-gray-400 font-medium mb-2">
                                    <Crown size={16} className="text-yellow-400" />
                                    เลือกตำแหน่ง
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => { if (canBeDealer) { SFX.click(); setHumanIsDealer(true); } }}
                                        disabled={!canBeDealer}
                                        className={`py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer relative flex flex-col items-center justify-center gap-1
                                            ${humanIsDealer
                                                ? 'bg-gradient-to-b from-yellow-400 to-amber-500 text-black shadow-lg shadow-amber-500/20'
                                                : canBeDealer
                                                    ? 'bg-white/5 text-gray-300 border border-white/8 hover:bg-white/10'
                                                    : 'bg-white/[0.02] text-gray-600 border border-white/5 cursor-not-allowed'}`}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>👑 รับเป็นเจ้ามือ</span>
                                        </div>
                                        {!canBeDealer && (
                                            <div className="flex items-center justify-center gap-0.5 text-[9px] text-red-400/70">
                                                <Lock size={10} />
                                                ทุนขั้นต่ำ {formatChips(selectedRoom.dealerMinCapital)}
                                            </div>
                                        )}
                                    </motion.button>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => { SFX.click(); setHumanIsDealer(false); }}
                                        className={`py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer flex flex-col items-center justify-center gap-1
                                            ${!humanIsDealer
                                                ? 'bg-gradient-to-b from-yellow-400 to-amber-500 text-black shadow-lg shadow-amber-500/20'
                                                : 'bg-white/5 text-gray-300 border border-white/8 hover:bg-white/10'}`}
                                    >
                                        <span>🙋‍♂️ ขอเป็นลูกขา</span>
                                    </motion.button>
                                </div>
                                {humanIsDealer ? (
                                    <p className="text-gray-500 text-[11px] text-center mt-1.5">
                                        💡 กินเรียบ/จ่ายรอบวง วัดใจกันไปเลย!
                                    </p>
                                ) : (
                                    <p className="text-gray-500 text-[11px] text-center mt-1.5">
                                        💡 เล่นสบายๆ ลุ้นไพ่สวยๆ กินเงินเจ้ามือ
                                    </p>
                                )}
                            </div>

                            {/* Your Chips */}
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4 p-2.5 rounded-xl bg-white/[0.03]">
                                ชิปของคุณ:
                                <span className="text-yellow-300 font-bold text-lg">{formatChips(profile.chips)}</span>
                            </div>

                            {/* Start */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleStart}
                                disabled={profile.chips < selectedRoom.minBet && !humanIsDealer}
                                className="btn-gold w-full text-xl py-4 flex items-center justify-center gap-2"
                            >
                                🚪 เข้าวง
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

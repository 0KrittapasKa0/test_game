import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Crown, ChevronRight, Lock, Volume2, Users } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { useOnlineStore } from '../store/useOnlineStore';
import { loadProfile, loadSettings } from '../utils/storage';
import { formatChips, numberToThaiVoice } from '../utils/formatChips';
import { ROOMS } from '../types/game';
import type { RoomConfig } from '../types/game';
import { SFX, speakPhrase } from '../utils/sound';

export default function GameSetupScreen() {
    const { setScreen, initGame, screen } = useGameStore();
    const profile = loadProfile()!;
    const settings = loadSettings();

    const [step, setStep] = useState<'room' | 'config'>('room');

    const [searchRoomId, setSearchRoomId] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [showSearchModal, setShowSearchModal] = useState(false);
    const { searchRoom } = useOnlineStore();

    // Reset to room selection when leaving the screen (so it's pre-rendered for next time)
    useEffect(() => {
        if (screen !== 'GAME_SETUP') {
            // Add a tiny delay so the fade-out animation finishes before the layout snaps back
            const timer = setTimeout(() => setStep('room'), 300);
            return () => clearTimeout(timer);
        }
    }, [screen]);

    const [selectedRoom, setSelectedRoom] = useState<RoomConfig>(
        ROOMS.find(r => r.id === settings.lastRoomId) || ROOMS[1]
    );
    const [playerCount, setPlayerCount] = useState(settings.lastPlayerCount);
    const [humanIsDealer, setHumanIsDealer] = useState(settings.lastHumanIsDealer);

    const canBeDealer = profile.chips >= selectedRoom.dealerMinCapital;

    const [selectedCategory, setSelectedCategory] = useState<'STANDARD' | 'HIGH_STAKES' | 'EXPERT' | 'LEGENDARY' | 'ULTIMATE'>('STANDARD');

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
        // Pick the best-fit room: highest room where player has ≥ 5× minBet (comfortable play)
        const comfortableRooms = ROOMS.filter(r => profile.chips >= r.minBet * 5);
        const affordableRooms = ROOMS.filter(r => profile.chips >= r.minBet);
        // Prefer comfortable rooms, fallback to any affordable room
        const candidates = comfortableRooms.length > 0 ? comfortableRooms : affordableRooms;
        if (candidates.length === 0) return;

        // Pick the highest tier room (last in sorted list), with 30% chance to go one tier lower for variety
        let roomIndex = candidates.length - 1;
        if (candidates.length >= 2 && Math.random() < 0.3) {
            roomIndex = candidates.length - 2;
        }
        const bestRoom = candidates[roomIndex];

        // Random player count 4-7 (sweet spot for card games)
        const randomPlayers = 4 + Math.floor(Math.random() * 4);
        // Random dealer (only if affordable)
        const canDeal = profile.chips >= bestRoom.dealerMinCapital;
        const randomDealer = canDeal && Math.random() < 0.3;
        initGame({
            playerCount: randomPlayers,
            humanIsDealer: randomDealer,
            room: bestRoom,
        });
    };

    const handleSearchRoom = async () => {
        if (!searchRoomId.trim()) return;

        setIsSearching(true);
        setSearchError('');

        try {
            const success = await searchRoom(searchRoomId.trim().toUpperCase());
            if (success) {
                setScreen('ONLINE_JOIN');
            } else {
                setSearchError('ไม่พบหมายเลขห้องนี้');
            }
        } catch (error) {
            setSearchError('เกิดข้อผิดพลาดในการค้นหา');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="w-full h-full bg-casino-table flex items-center justify-center p-4 sm:p-6 overflow-y-auto relative">
            {/* Ambient Dark Vignette overlay */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />

            <motion.div
                className="w-full max-w-lg relative z-10"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <div className="bg-black/60 border border-yellow-500/20 shadow-2xl rounded-3xl p-5 sm:p-7 backdrop-blur-xl relative overflow-hidden">
                    {/* Top Glow Decor */}
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

                    {/* Top Action Bar (Back) */}
                    <div className="flex justify-between items-center mb-2 relative z-20">
                        {/* Back Button */}
                        <button
                            onClick={() => {
                                if (step === 'config') {
                                    setStep('room');
                                } else {
                                    setScreen('MENU');
                                }
                            }}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition cursor-pointer shadow-lg shrink-0"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {/* ===== STEP 1: Room Selection ===== */}
                        {step === 'room' && (
                            <motion.div
                                key="room"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="mt-2"
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
                                <div className="flex p-1 bg-black/40 border border-white/5 rounded-2xl mb-4 gap-0.5 overflow-x-auto shadow-inner">
                                    {([
                                        { key: 'STANDARD', label: '🟢 ทั่วไป', style: 'text-white/70 hover:text-white hover:bg-white/10', activeStyle: 'bg-gradient-to-b from-emerald-600/30 to-green-900/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(34,197,94,0.15)] font-bold' },
                                        { key: 'HIGH_STAKES', label: '🔵 เดิมพันสูง', style: 'text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10', activeStyle: 'bg-gradient-to-b from-blue-500/30 to-blue-900/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)] font-bold' },
                                        { key: 'EXPERT', label: '🟣 เซียน', style: 'text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10', activeStyle: 'bg-gradient-to-b from-purple-600/30 to-purple-900/10 text-purple-300 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)] font-bold' },
                                        { key: 'LEGENDARY', label: '🔴 ตำนาน', style: 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10', activeStyle: 'bg-gradient-to-b from-red-600/30 to-orange-600/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)] font-bold' },
                                        { key: 'ULTIMATE', label: '⚫ สูงสุด', style: 'text-gray-400/60 hover:text-gray-300 hover:bg-gray-500/10', activeStyle: 'bg-gradient-to-b from-gray-600/30 to-gray-900/10 text-gray-200 border border-gray-500/20 shadow-[0_0_10px_rgba(107,114,128,0.15)] font-bold' },
                                    ] as const).map(tab => {
                                        const isActive = selectedCategory === tab.key;
                                        return (
                                            <button
                                                key={tab.key}
                                                onClick={() => {
                                                    setSelectedCategory(tab.key);
                                                    if (!isActive) {
                                                        const vibeMap: Record<string, string> = {
                                                            'STANDARD': 'ระดับทั่วไป คลาสสิก เหมาะสำหรับมือใหม่ค่ะ',
                                                            'HIGH_STAKES': 'ระดับเดิมพันสูง โต๊ะวีไอพีหรูหราค่ะ',
                                                            'EXPERT': 'ระดับเซียน แหล่งรวมยอดฝีมือค่ะ',
                                                            'LEGENDARY': 'ระดับตำนาน โต๊ะหินอัคนีสุดเดือดค่ะ',
                                                            'ULTIMATE': 'ระดับสูงสุด เหนือกาลเวลา ทะลุมิติค่ะ'
                                                        };
                                                        speakPhrase(vibeMap[tab.key]);
                                                    }
                                                }}
                                                className={`flex-1 py-2 text-[10px] sm:text-xs rounded-xl transition-all whitespace-nowrap px-1.5
                                                    ${isActive ? tab.activeStyle : tab.style}
                                                `}
                                            >
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Room Selection List */}
                                <div className="space-y-2 mb-4">
                                    {ROOMS.filter(r => r.category === selectedCategory).map((room) => {
                                        const affordable = profile.chips >= room.minBet;
                                        return (
                                            <motion.button
                                                key={room.id}
                                                whileTap={affordable ? { scale: 0.96 } : {}}
                                                onClick={() => affordable && handleSelectRoom(room)}
                                                disabled={!affordable}
                                                className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer relative overflow-hidden border group
                                                    ${affordable
                                                        ? 'bg-black/50 border-white/10 hover:border-yellow-500/30 hover:bg-black/70 shadow-lg hover:shadow-[0_0_15px_rgba(250,204,21,0.1)]'
                                                        : 'bg-black/30 border-white/5 opacity-50 cursor-not-allowed grayscale'}`}
                                            >
                                                {affordable && (
                                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                )}

                                                {/* Left Icon Panel */}
                                                <div
                                                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 border relative shadow-inner"
                                                    style={{
                                                        backgroundColor: room.color + (affordable ? '20' : '10'),
                                                        borderColor: room.color + (affordable ? '40' : '20')
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-white/5 rounded-xl shine-effect" />
                                                    <span className="drop-shadow-lg relative z-10">{room.emoji}</span>
                                                </div>

                                                {/* Room Info */}
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className={`font-bold text-sm sm:text-base leading-tight mb-0.5 ${affordable ? 'text-white' : 'text-white/50'}`}>
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

                                                {/* Voice Announcer Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // prevent triggering the room selection
                                                        const minBetVoice = numberToThaiVoice(room.minBet);
                                                        const maxBetVoice = numberToThaiVoice(room.maxBet);
                                                        const dealerCapVoice = numberToThaiVoice(room.dealerMinCapital);
                                                        const text = `โต๊ะ ${room.name} เดิมพันขั้นต่ำ ${minBetVoice} สูงสุด ${maxBetVoice} ต้องการทุนสำหรับเป็นเจ้ามืออย่างน้อย ${dealerCapVoice} ค่ะ`;
                                                        speakPhrase(text);
                                                    }}
                                                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400/70 hover:text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors z-10 mr-1"
                                                >
                                                    <Volume2 size={14} />
                                                </button>

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

                                {/* Action Buttons: Search and Quick Start */}
                                <div className="flex gap-3 mt-4">
                                    {/* Search Button */}
                                    <div className="relative">
                                        {/* Unstable badge */}
                                        <div className="absolute -top-2 -right-2 z-20 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)] tracking-widest uppercase border border-orange-300/30">
                                            ไม่เสถียร
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => { SFX.click(); setShowSearchModal(true); }}
                                            className="px-4 py-2.5 rounded-2xl font-bold text-sm tracking-widest cursor-pointer transition-all relative overflow-hidden bg-black/60 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/40 hover:border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center justify-center gap-2 shrink-0"
                                        >
                                            <span className="text-lg">🔍</span> ค้นหา
                                        </motion.button>
                                    </div>

                                    {/* Quick Start Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => { speakPhrase('ร่วมวงทันที'); handleQuickStart(); }}
                                        className="flex-1 px-4 py-2.5 rounded-2xl text-black font-bold text-base tracking-widest cursor-pointer transition-all relative overflow-hidden bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 border border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] uppercase flex items-center justify-center gap-2"
                                    >
                                        <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity" />
                                        <span className="text-xl drop-shadow-md z-10">🎲</span>
                                        <span className="relative z-10 drop-shadow-md">ร่วมวงทันที</span>
                                    </motion.button>
                                </div>
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
                                <h3 className="text-center font-medium text-white/50 text-xs tracking-widest uppercase mb-4">
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
                                        <div className="text-yellow-500/70 text-[10px] font-medium tracking-widest uppercase mb-0.5">{selectedRoom.category} ROOM</div>
                                        <p className="text-white font-semibold text-base leading-tight drop-shadow-md">{selectedRoom.name}</p>
                                        <p className="text-white/50 text-[11px] tracking-wider mt-0.5">
                                            {formatChips(selectedRoom.minBet)} - {formatChips(selectedRoom.maxBet)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setStep('room')}
                                        className="text-white/40 hover:text-white text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer font-semibold transition-colors z-10"
                                    >
                                        เปลี่ยน
                                    </button>
                                </div>

                                {/* Player Count */}
                                <div className="mb-6 bg-black/40 p-4 rounded-2xl border border-white/5">
                                    <label className="flex items-center gap-2 text-xs text-white/60 font-semibold uppercase tracking-widest mb-3">
                                        <Users size={16} className="text-blue-400" />
                                        จำนวนขาไพ่ในวง
                                    </label>
                                    <div className="grid grid-cols-3 gap-2 justify-center">
                                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                            <motion.button
                                                key={n}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => { SFX.click(); setPlayerCount(n); speakPhrase(`วงไพ่ ${n} ท่าน ค่ะ`); }}
                                                className={`h-12 rounded-xl text-lg transition-all cursor-pointer border relative overflow-hidden
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
                                        <span className="text-white/30 text-[10px] uppercase tracking-widest px-2 font-semibold">
                                            ขนาดโต๊ะ {playerCount} ที่นั่ง
                                        </span>
                                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                    </div>
                                </div>

                                {/* Dealer Position Context */}
                                <div className="mb-8">
                                    <label className="flex items-center gap-2 text-xs text-white/60 font-semibold uppercase tracking-widest mb-3 px-1">
                                        <Crown size={16} className="text-yellow-400" />
                                        ระบุบทบาทของคุณ
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Dealer Option */}
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => { if (canBeDealer) { SFX.click(); setHumanIsDealer(true); speakPhrase('คุณเป็นเจ้ามือ กินให้เรียบแล้วรวบยกโต๊ะเลยค่ะ!'); } }}
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
                                                <span className={`font-semibold tracking-wider ${humanIsDealer ? 'text-yellow-400' : ''}`}>เป็นเจ้ามือ</span>
                                            </div>

                                            {canBeDealer ? (
                                                <span className={`text-[10px] ${humanIsDealer ? 'text-yellow-500/80 font-semibold' : 'text-white/30'} flex-1 flex items-end mt-1`}>กินเรียบ/จ่ายรอบวง!</span>
                                            ) : (
                                                <div className="flex flex-col items-center justify-end flex-1 w-full mt-1">
                                                    <div className="flex items-center gap-1 text-[9px] text-red-500/80 font-semibold bg-red-950/50 px-2 py-0.5 rounded-full border border-red-500/20 truncate w-full justify-center">
                                                        <Lock size={10} className="shrink-0" />
                                                        <span className="truncate">ทุนขั้นต่ำ {formatChips(selectedRoom.dealerMinCapital)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.button>

                                        {/* Player Option */}
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => { SFX.click(); setHumanIsDealer(false); speakPhrase('คุณเป็นลูกขา ลุ้นไพ่แล้วขยี้เจ้ามือกันเถอะค่ะ!'); }}
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
                                                <span className={`font-semibold tracking-wider ${!humanIsDealer ? 'text-blue-400' : ''}`}>เป็นลูกขา</span>
                                            </div>
                                            <span className={`text-[10px] mt-1 ${!humanIsDealer ? 'text-blue-400/80 font-semibold' : 'text-white/30'}`}>ลุ้นไพ่สวยๆ แทงสบายๆ</span>
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Action Bar */}
                                <div className="pt-2 border-t border-white/5 mt-auto">
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <span className="text-white/40 text-xs font-semibold uppercase tracking-widest">ยอดชิปคงเหลือ:</span>
                                        <span className="text-yellow-400 font-semibold text-lg drop-shadow-md">{formatChips(profile.chips)}</span>
                                    </div>

                                    {/* Button Row */}
                                    <div className="flex gap-3">
                                        {/* Create Room Button (Online Testing) */}
                                        <div className="relative flex-1">
                                            {/* Unstable badge */}
                                            <div className="absolute -top-2 -right-1 z-20 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)] tracking-widest uppercase border border-orange-300/30">
                                                ไม่เสถียร
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.96 }}
                                                onClick={() => {
                                                    speakPhrase('สร้างห้องออนไลน์ค่ะ');
                                                    useOnlineStore.getState().createRoom({
                                                        playerCount,
                                                        humanIsDealer: canBeDealer ? humanIsDealer : false,
                                                        room: selectedRoom,
                                                    });
                                                    setScreen('ONLINE_PLAYING');
                                                }}
                                                disabled={profile.chips < selectedRoom.minBet && !humanIsDealer}
                                                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed
                                                    bg-gradient-to-b from-cyan-600/80 to-blue-900/80
                                                    border border-cyan-400
                                                    shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                                                <span className="text-lg relative z-10 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">🌐</span>
                                                <span className="text-cyan-100 font-bold text-sm tracking-wider relative z-10">สร้างห้อง</span>
                                            </motion.button>
                                        </div>

                                        {/* Join Game Button */}
                                        <motion.button
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => { speakPhrase('ขอให้โชคดีนะคะ'); handleStart(); }}
                                            disabled={profile.chips < selectedRoom.minBet && !humanIsDealer}
                                            className="flex-1 btn-gold text-base py-3 flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed rounded-2xl"
                                        >
                                            <span className="text-lg">🚪</span>
                                            <span className="font-bold tracking-widest">ร่วมวง</span>
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div >

            {/* ===== Search Modal ===== */}
            <AnimatePresence>
                {
                    showSearchModal && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center px-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Backdrop */}
                            <motion.div
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => {
                                    SFX.click();
                                    setShowSearchModal(false);
                                }}
                            />

                            {/* Modal Content */}
                            <motion.div
                                className="bg-gray-900 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)] rounded-3xl p-6 w-full max-w-sm relative z-10"
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                            >
                                <h2 className="text-xl font-bold text-center text-cyan-400 mb-6 drop-shadow-md">
                                    ค้นหาห้อง
                                </h2>

                                <div className="relative mb-6">
                                    <input
                                        type="text"
                                        placeholder="รหัสห้อง 6 หลัก"
                                        value={searchRoomId}
                                        onChange={(e) => {
                                            setSearchRoomId(e.target.value.toUpperCase().slice(0, 6));
                                            if (searchError) setSearchError('');
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && searchRoomId.trim()) handleSearchRoom();
                                        }}
                                        className={`w-full bg-black/50 border ${searchError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-cyan-500'} rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-white placeholder:text-white/20 outline-none transition-colors uppercase`}
                                        autoFocus
                                    />
                                    {searchError && (
                                        <p className="absolute -bottom-5 left-0 right-0 text-center text-red-400 text-xs font-semibold animate-pulse">
                                            {searchError}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => { SFX.click(); setShowSearchModal(false); }}
                                        className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition-colors"
                                    >
                                        ยกเลิก
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleSearchRoom}
                                        disabled={isSearching || !searchRoomId.trim()}
                                        className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:grayscale transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] relative flex items-center justify-center"
                                    >
                                        {isSearching ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            'เข้าร่วม'
                                        )}
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}

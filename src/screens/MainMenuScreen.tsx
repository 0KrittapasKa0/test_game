import { motion } from 'framer-motion';
import { Play, Settings, Gift, User } from 'lucide-react';
import { ChipIcon } from '../components/ChipIcon';
import { PokDengLogo } from '../components/PokDengLogo';
import { useGameStore } from '../store/useGameStore';
import { loadProfile } from '../utils/storage';
import { SFX, speakWelcome, speakPhrase } from '../utils/sound';
import { formatChips } from '../utils/formatChips';
import { useMemo, useEffect } from 'react';

// Generates random configurations for floating background cards
const generateCards = (count: number) => {
    const suits = ['heart', 'spade black', 'diamond', 'club'];
    return Array.from({ length: count }).map((_, i) => ({
        id: i,
        suit: suits[Math.floor(Math.random() * suits.length)],
        left: Math.random() * 100, // percentage
        delay: Math.random() * 10,  // seconds
        duration: 10 + Math.random() * 15, // seconds
        size: 0.6 + Math.random() * 0.8 // scale
    }));
};

let hasGreeted = false; // Module-level flag to track if we've already greeted the player

export default function MainMenuScreen() {
    const setScreen = useGameStore(s => s.setScreen);
    const profile = loadProfile()!;

    // Memoize the background cards so they don't re-render and jump around
    const bgCards = useMemo(() => generateCards(15), []);

    useEffect(() => {
        // อ้างอิง Browser Autoplay Policy: เสียงจะดังได้ก็ต่อเมื่อผู้เล่นมี Reaction กับหน้าเว็บก่อน (เช่น แตะจอ, ขยับเมาส์คลิก)
        const playWelcome = () => {
            if (!hasGreeted) {
                hasGreeted = true;
                // หน่วงเวลาเล็กน้อยให้ดูเป็นธรรมชาติ
                setTimeout(() => speakWelcome(profile?.name), 300);
            }
            // ลบ Event ออกเพื่อไม่ให้ทำงานซ้ำ
            window.removeEventListener('pointerdown', playWelcome);
            window.removeEventListener('keydown', playWelcome);
        };

        if (!hasGreeted) {
            // ดักการกระทำครั้งแรกของผู้เล่นบนหน้าจอเพื่อปลดล็อกเสียง
            window.addEventListener('pointerdown', playWelcome);
            window.addEventListener('keydown', playWelcome);
        }

        return () => {
            window.removeEventListener('pointerdown', playWelcome);
            window.removeEventListener('keydown', playWelcome);
        };
    }, [profile?.name]);

    const nav = (screen: Parameters<typeof setScreen>[0]) => {
        SFX.navigate();
        setScreen(screen);
    };

    return (
        <div className="w-full h-full bg-casino-table flex items-center justify-center p-4 sm:p-6 overflow-hidden relative">
            {/* Ambient Lighting & Particles */}
            <div className="absolute inset-0 pointer-events-none mix-blend-screen">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #fbbf24, transparent 60%)', filter: 'blur(80px)', transform: 'translate(-50%, -50%)' }} />
                <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #4ade80, transparent 60%)', filter: 'blur(100px)', transform: 'translate(50%, 50%)' }} />
            </div>

            {/* Floating Cards Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {bgCards.map(card => (
                    <div
                        key={card.id}
                        className={`floating-card ${card.suit}`}
                        style={{
                            left: `${card.left}%`,
                            animationDelay: `${card.delay}s`,
                            animationDuration: `${card.duration}s`,
                            transform: `scale(${card.size})`
                        }}
                    >
                        {/* Center suit large watermark */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 text-4xl">
                            {card.suit.includes('heart') ? '♥' : card.suit.includes('spade') ? '♠' : card.suit.includes('club') ? '♣' : '♦'}
                        </div>
                    </div>
                ))}
            </div>

            <motion.div
                className="w-full max-w-md text-center relative z-10 flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                {/* Logo Area */}
                <div className="relative mb-6 mt-4">
                    <motion.div
                        className="absolute inset-0 rounded-full bg-yellow-500/20 blur-2xl"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="relative z-10 flex items-center justify-center w-28 h-28 mx-auto rounded-full border-4 border-yellow-500/30 bg-black/40 backdrop-blur-md shadow-2xl shadow-yellow-500/20 mb-3"
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.1 }}
                        whileHover={{ scale: 1.05, borderColor: "rgba(234, 179, 8, 0.6)" }}
                    >
                        <PokDengLogo className="w-full h-full" />
                    </motion.div>

                    <motion.h1
                        className="text-5xl sm:text-6xl font-bold text-gold-gradient tracking-tight"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
                        ป๊อกเด้ง
                    </motion.h1>
                    <motion.div
                        className="flex items-center justify-center gap-2 mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-yellow-500/50" />
                        <p className="text-yellow-500/80 text-xs tracking-[0.3em] font-medium uppercase">Pok Deng</p>
                        <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-yellow-500/50" />
                    </motion.div>
                </div>

                <motion.div
                    className="w-full relative p-[1px] rounded-2xl mb-8 group cursor-pointer"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => nav('PROFILE')}
                    onPointerEnter={() => speakPhrase('ดูโปรไฟล์ของฉัน')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {/* Glowing border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/50 via-yellow-400/50 to-yellow-600/50 rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity blur-sm" />

                    <div className="relative glass p-4 flex items-center gap-4 text-left border border-white/10 shadow-xl overflow-hidden"
                        style={{ background: 'rgba(0,0,0,0.6)' }}>
                        {/* Shimmer effect inside card */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                        <div className="relative">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-[0_0_15px_rgba(250,204,21,0.3)] overflow-hidden border-2 border-yellow-500/50"
                                style={!profile.avatarUrl ? { backgroundColor: profile.avatarColor } : {}}
                            >
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                    profile.name.charAt(0).toUpperCase()
                                )}
                            </div>
                        </div>

                        <div className="min-w-0 flex-1 py-1">
                            <p className="text-white text-xl font-medium truncate tracking-wide">{profile.name}</p>
                            <div className="flex items-center gap-1.5 mt-1 bg-black/40 w-fit px-2.5 py-1 rounded-full border border-yellow-500/20">
                                <ChipIcon className="w-5 h-5" />
                                <span className="text-yellow-300 text-lg font-semibold tracking-wider">{formatChips(profile.chips)}</span>
                            </div>
                        </div>

                        <div className="text-white/30 shrink-0 pr-2 group-hover:text-yellow-500/70 transition-colors">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </div>
                    </div>
                </motion.div>

                {/* Action Buttons */}
                <div className="w-full flex justify-between gap-3 px-2">
                    <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onPointerEnter={() => speakPhrase('โปรไฟล์ผู้เล่น')}
                        onClick={() => nav('PROFILE')}
                        className="btn-dark flex-1 flex flex-col items-center justify-center gap-2 py-4 backdrop-blur-sm border-white/10 hover:border-yellow-500/30 group relative overflow-hidden"
                        style={{ background: 'rgba(0,0,0,0.4)' }}
                    >
                        <User size={24} className="text-white/70 group-hover:text-yellow-400 transition-colors" />
                        <span className="text-sm font-normal tracking-wide">โปรไฟล์</span>
                    </motion.button>

                    {/* Primary Play Button */}
                    <motion.div className="flex-1 max-w-[140px] -mt-6 z-20"
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.55, type: 'spring', stiffness: 200, damping: 20 }}
                    >
                        <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onPointerEnter={() => speakPhrase('เลือกโต๊ะเที่จะร่วมวง')}
                            onClick={() => nav('GAME_SETUP')}
                            className="btn-gold w-full h-full flex flex-col items-center justify-center gap-2 py-6 rounded-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(245,158,11,0.4)] border-b-4 border-yellow-700"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/2 rounded-t-2xl pointer-events-none" />
                            <div className="absolute top-0 left-0 w-full h-full bg-white/20 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
                            <Play size={32} fill="currentColor" className="drop-shadow-md text-black" />
                            <span className="text-xl font-semibold tracking-widest drop-shadow-sm text-black">เล่นเกม</span>
                        </motion.button>
                    </motion.div>

                    <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onPointerEnter={() => speakPhrase('การตั้งค่า')}
                        onClick={() => nav('SETTINGS')}
                        className="btn-dark flex-1 flex flex-col items-center justify-center gap-2 py-4 backdrop-blur-sm border-white/10 hover:border-yellow-500/30 group"
                        style={{ background: 'rgba(0,0,0,0.4)' }}
                    >
                        <Settings size={24} className="text-white/70 group-hover:text-yellow-400 transition-colors" />
                        <span className="text-sm font-normal tracking-wide">ตั้งค่า</span>
                    </motion.button>
                </div>

                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    onPointerEnter={() => speakPhrase('กิจกรรมรับชิป')}
                    onClick={() => nav('REWARD_CODE')}
                    className="mt-6 flex items-center justify-center gap-2 text-yellow-500/80 hover:text-yellow-400 text-sm font-normal transition-colors px-6 py-2.5 rounded-full border border-yellow-500/10 hover:bg-yellow-500/10"
                    style={{ background: 'rgba(0,0,0,0.2)' }}
                >
                    <Gift size={16} />
                    <span>กิจกรรมรับชิป</span>
                </motion.button>

                <p className="text-white/20 text-[10px] mt-8 tracking-widest uppercase mb-4">Beta Version 1.0</p>
            </motion.div>
        </div>
    );
}

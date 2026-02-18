import { motion } from 'framer-motion';
import { Play, Settings, Gift, Coins, User } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { loadProfile } from '../utils/storage';
import { SFX } from '../utils/sound';
import { formatChips } from '../utils/formatChips';

export default function MainMenuScreen() {
    const setScreen = useGameStore(s => s.setScreen);
    const profile = loadProfile()!;

    const nav = (screen: Parameters<typeof setScreen>[0]) => {
        SFX.navigate();
        setScreen(screen);
    };

    return (
        <div className="w-full h-full page-bg flex items-center justify-center p-4 sm:p-6 overflow-y-auto relative">
            {/* Decorative background glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04]"
                    style={{ background: 'radial-gradient(circle, #fbbf24, transparent 70%)' }} />
            </div>

            <motion.div
                className="w-full max-w-sm text-center relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                {/* Logo */}
                <motion.div
                    className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-2"
                    style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.1) 0%, transparent 70%)' }}
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                >
                    <motion.span
                        className="text-6xl sm:text-7xl"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    >
                        🃏
                    </motion.span>
                </motion.div>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 leading-tight">
                    ป๊อกเด้ง
                </h1>
                <p className="text-gray-600 text-xs mb-5 tracking-[0.15em]">POK DENG</p>

                {/* Player Card */}
                <motion.div
                    className="glass p-4 mb-6 flex items-center gap-3 text-left cursor-pointer hover:bg-white/[0.04] transition-colors"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    onClick={() => nav('PROFILE')}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg overflow-hidden"
                        style={!profile.avatarUrl ? { backgroundColor: profile.avatarColor } : {}}
                    >
                        {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            profile.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-white text-lg font-semibold truncate">{profile.name}</p>
                        <div className="flex items-center gap-1.5">
                            <Coins size={16} className="text-yellow-400 shrink-0" />
                            <span className="text-yellow-300 text-xl font-bold">{formatChips(profile.chips)}</span>
                            <span className="text-gray-500 text-xs">ชิป</span>
                        </div>
                    </div>
                </motion.div>

                {/* Buttons */}
                <div className="space-y-3">
                    <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => nav('GAME_SETUP')}
                        className="btn-gold w-full flex items-center justify-center gap-2.5 text-xl py-4"
                    >
                        <Play size={24} fill="currentColor" />
                        เล่นเกม
                    </motion.button>

                    <div className="grid grid-cols-3 gap-3">
                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => nav('PROFILE')}
                            className="btn-dark flex flex-col items-center justify-center gap-1.5 text-sm py-3.5"
                        >
                            <User size={20} />
                            โปรไฟล์
                        </motion.button>

                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => nav('REWARD_CODE')}
                            className="btn-dark flex flex-col items-center justify-center gap-1.5 text-sm py-3.5"
                        >
                            <Gift size={20} />
                            รับชิป
                        </motion.button>

                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => nav('SETTINGS')}
                            className="btn-dark flex flex-col items-center justify-center gap-1.5 text-sm py-3.5"
                        >
                            <Settings size={20} />
                            ตั้งค่า
                        </motion.button>
                    </div>
                </div>

                <p className="text-gray-700 text-[11px] mt-6 tracking-wide">v1.0 · เล่นฟรี · ออฟไลน์</p>
            </motion.div>
        </div>
    );
}

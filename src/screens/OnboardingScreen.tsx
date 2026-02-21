import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { AVATAR_COLORS } from '../types/game';
import type { AvatarColor } from '../types/game';
import { createDefaultProfile, saveProfile } from '../utils/storage';
import { SFX } from '../utils/sound';
import { Sparkles } from 'lucide-react';

/**
 * Compress an image file to a small base64 JPEG string.
 * - Scales down to max 150x150
 * - Compresses to JPEG quality 0.7
 */
function compressImage(file: File, maxSize = 150): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Crop to square from center
                const min = Math.min(img.width, img.height);
                const sx = (img.width - min) / 2;
                const sy = (img.height - min) / 2;
                canvas.width = maxSize;
                canvas.height = maxSize;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, sx, sy, min, min, 0, 0, maxSize, maxSize);
                const base64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(base64);
            };
            img.onerror = reject;
            img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function OnboardingScreen() {
    const setScreen = useGameStore(s => s.setScreen);
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [randomColor, setRandomColor] = useState<AvatarColor>(AVATAR_COLORS[0]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Set a random color on mount
    useEffect(() => {
        const rand = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        setRandomColor(rand);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setAvatarUrl(compressed);
            SFX.click();
        } catch {
            console.warn('Image compression failed');
        }
    };

    const handleStart = () => {
        if (name.trim().length === 0) return;
        SFX.betConfirm();
        const profile = createDefaultProfile(name.trim(), randomColor, avatarUrl || undefined);
        saveProfile(profile);
        setScreen('MENU');
    };

    const canStart = name.trim().length > 0;

    return (
        <div className="w-full h-full bg-casino-table flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative">

            {/* Dark vignette matching SettingsScreen */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-0" />

            <motion.div
                className="w-full max-w-md relative z-10 flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
            >
                {/* Header Section */}
                <div className="text-center mb-8 relative">
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-500/20 blur-[50px] rounded-full pointer-events-none"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.h1
                        className="text-6xl sm:text-7xl font-black text-gold-gradient tracking-tight drop-shadow-2xl relative z-10"
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1, type: "spring" }}
                    >
                        ป๊อกเด้ง
                    </motion.h1>
                    <motion.div
                        className="flex items-center justify-center gap-3 mt-3 relative z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-yellow-500/50" />
                        <p className="text-yellow-400 text-xs sm:text-sm tracking-[0.3em] font-bold uppercase drop-shadow-md">สร้างโปรไฟล์ผู้เล่น</p>
                        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-yellow-500/50" />
                    </motion.div>
                </div>

                {/* Main Card */}
                <div className="w-full relative p-[1px] rounded-[32px] group">
                    {/* Glowing border effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/50 via-amber-500/10 to-transparent rounded-[32px] opacity-60 blur-sm" />

                    <div className="relative glass p-8 sm:p-10 flex flex-col items-center gap-8 border border-white/10 shadow-2xl overflow-hidden rounded-[32px] bg-black/60 backdrop-blur-xl">
                        {/* Inner corner glows */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-yellow-500/10 blur-[50px] rounded-full pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none" />

                        {/* Avatar Upload Section */}
                        <div className="flex flex-col items-center relative z-10">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => fileInputRef.current?.click()}
                                className="w-36 h-36 rounded-full cursor-pointer relative transition-all duration-300 border-[3px] border-yellow-500/40 hover:border-yellow-400 overflow-hidden shadow-[0_0_40px_rgba(250,204,21,0.2)] bg-black/50 flex items-center justify-center p-1"
                            >
                                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black/40 relative">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center"
                                            style={{ background: `linear-gradient(135deg, ${randomColor}80, ${randomColor}30)` }}
                                        >
                                            <span className="text-6xl font-black text-white drop-shadow-lg">
                                                {name.trim() ? name.trim().charAt(0).toUpperCase() : '?'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <p className="mt-4 text-white/50 text-xs font-medium tracking-widest uppercase">แตะเพื่อเปลี่ยนรูป (ทางเลือก)</p>
                        </div>

                        {/* Name Input */}
                        <div className="w-full relative z-10">
                            <div className="relative group/input">
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-yellow-500/20 rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition duration-500" />
                                <div className="relative bg-black/40 border border-white/10 focus-within:border-yellow-500/50 rounded-2xl flex items-center px-4 transition-colors shadow-inner">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && canStart && handleStart()}
                                        placeholder="ตั้งชื่อในเกมของคุณ"
                                        maxLength={20}
                                        className="w-full text-center text-xl sm:text-2xl font-black py-5 bg-transparent text-white placeholder-white/20 focus:outline-none tracking-wider"
                                    />
                                    <AnimatePresence>
                                        {name.length > 0 && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                className="absolute right-4 text-yellow-400"
                                            >
                                                <Sparkles size={20} className="animate-pulse" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Action Lines */}
                        <div className="w-full flex items-center gap-4 relative z-10 opacity-30 mt-2 mb-2">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/50" />
                            <div className="w-2 h-2 rotate-45 border border-white/50" />
                            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/50" />
                        </div>

                        {/* Action Button */}
                        <motion.button
                            whileHover={canStart ? { scale: 1.02, y: -2 } : {}}
                            whileTap={canStart ? { scale: 0.98 } : {}}
                            onClick={handleStart}
                            disabled={!canStart}
                            className={`w-full py-5 rounded-2xl font-black text-xl tracking-widest transition-all relative overflow-hidden group/btn shadow-xl
                                ${canStart
                                    ? 'btn-gold text-black border-b-4 border-yellow-700 hover:shadow-[0_10px_30px_rgba(245,158,11,0.4)]'
                                    : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5 shadow-none'
                                }`}
                        >
                            {canStart && (
                                <>
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/2 pointer-events-none" />
                                    <div className="absolute top-0 left-0 w-full h-full bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none" />
                                </>
                            )}
                            <span className="relative z-10 drop-shadow-sm flex items-center justify-center gap-2">
                                เริ่มเกม <span>🚀</span>
                            </span>
                        </motion.button>

                    </div>
                </div>
            </motion.div>
        </div>
    );
}

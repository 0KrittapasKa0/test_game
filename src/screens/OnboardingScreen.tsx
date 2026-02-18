import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { AVATAR_COLORS } from '../types/game';
import type { AvatarColor } from '../types/game';
import { createDefaultProfile, saveProfile } from '../utils/storage';
import { SFX } from '../utils/sound';
import { Camera, Sparkles } from 'lucide-react';

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
        <div className="w-full h-full page-bg flex items-center justify-center p-4 sm:p-6 overflow-hidden relative">
            {/* Animated floating suits background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {['♠', '♥', '♦', '♣', '♠', '♥', '♦', '♣'].map((suit, i) => (
                    <motion.span
                        key={i}
                        className="absolute text-white/[0.03] select-none font-serif"
                        style={{
                            fontSize: `${24 + (i * 7) % 30}px`,
                            left: `${10 + (i * 12) % 90}%`,
                            top: `${5 + (i * 15) % 85}%`,
                        }}
                        animate={{
                            y: [0, -20, 0],
                            rotate: [0, i % 2 === 0 ? 10 : -10, 0],
                            opacity: [0.03, 0.06, 0.03],
                        }}
                        transition={{ repeat: Infinity, duration: 4 + i * 0.5, ease: 'easeInOut', delay: i * 0.3 }}
                    >
                        {suit}
                    </motion.span>
                ))}
            </div>

            <motion.div
                className="relative z-10 w-full max-w-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                {/* Main Card */}
                <div className="glass p-8 rounded-[2rem] shadow-2xl border border-yellow-500/20 relative overflow-hidden bg-black/40 backdrop-blur-xl">
                    {/* Decorative glow */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 blur-[60px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />

                    {/* Gold Line Decoration */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-900/50 to-transparent" />

                    {/* Header */}
                    <div className="text-center mb-10 relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-yellow-500/20 blur-[40px] rounded-full pointer-events-none" />
                        <motion.h1
                            className="text-5xl font-extrabold text-white mb-2 tracking-tighter drop-shadow-2xl font-serif"
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                ป๊อกเด้ง
                            </span>
                        </motion.h1>
                        <motion.p
                            className="text-yellow-100/60 text-sm font-light tracking-widest uppercase"
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            พร้อมแล้วหรือยัง สำหรับการเป็นตำนานเซียนไพ่
                        </motion.p>
                    </div>

                    {/* Avatar Upload Section */}
                    <div className="flex flex-col items-center mb-8 relative">
                        <motion.div
                            whileHover={{ scale: 1.05, borderColor: 'rgba(234, 179, 8, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => fileInputRef.current?.click()}
                            className="w-32 h-32 rounded-full shadow-[0_0_40px_rgba(234,179,8,0.15)] cursor-pointer relative group transition-all duration-300 border-[3px] border-yellow-500/30 hover:border-yellow-400 overflow-hidden bg-black/50"
                            style={!avatarUrl ? { backgroundColor: randomColor, boxShadow: `0 0 30px ${randomColor}30` } : {}}
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
                                    <span className="text-5xl font-bold text-white drop-shadow-lg">
                                        {name.trim() ? name.trim().charAt(0).toUpperCase() : '?'}
                                    </span>
                                </div>
                            )}

                            {/* Overlay with Camera Icon */}
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                                <Camera className="text-yellow-400 mb-1" size={28} />
                                <span className="text-white text-[10px] font-medium tracking-wide uppercase">Upload</span>
                            </div>
                        </motion.div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {/* Name Input */}
                    <div className="mb-8 relative px-4">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && canStart && handleStart()}
                                placeholder="ชื่อของคุณ"
                                maxLength={20}
                                className="relative w-full text-center text-xl font-bold p-5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/10 focus:border-yellow-500/50 focus:bg-black/70 focus:outline-none transition-all shadow-inner tracking-wider uppercase"
                            />
                            {name.length > 0 && (
                                <motion.div
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 bg-green-900/20 p-1 rounded-full border border-green-500/20"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                >
                                    <Sparkles size={16} />
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Action Button */}
                    <motion.button
                        whileHover={canStart ? { scale: 1.02, textShadow: "0 0 12px rgba(253, 224, 71, 0.6)" } : {}}
                        whileTap={canStart ? { scale: 0.98 } : {}}
                        onClick={handleStart}
                        disabled={!canStart}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all tracking-widest uppercase border border-transparent
                            ${canStart
                                ? 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 text-white border-t-yellow-400/30'
                                : 'bg-white/5 text-gray-600 cursor-not-allowed border-white/5'
                            }`}
                    >
                        เข้าวง
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}

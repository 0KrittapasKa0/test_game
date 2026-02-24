import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { unlockSpeech } from '../utils/sound';

interface SplashScreenProps {
    loadProgress: number; // 0 - 100
}

export default function SplashScreen({ loadProgress }: SplashScreenProps) {
    const completeSplash = useGameStore(s => s.completeSplash);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        if (loadProgress >= 100) {
            // ให้ค้างหน้าหลอด 100% ไว้แป๊บนึงก่อนขึ้นข้อความให้แตะหน้าจอ 
            const timer = setTimeout(() => setIsLoaded(true), 400);
            return () => clearTimeout(timer);
        }
    }, [loadProgress]);

    // ตอนเข้ามาครั้งแรกให้เช็คเผื่อไว้ (จริงๆ จะดังตอนเข้าเมนูหลักถ้าแตะหน้านี้แล้ว)
    useEffect(() => {
        const handleInteraction = () => {
            window.removeEventListener('pointerdown', handleInteraction);
        };
        window.addEventListener('pointerdown', handleInteraction);
        return () => window.removeEventListener('pointerdown', handleInteraction);
    }, []);

    const handleTap = () => {
        if (isLoaded && !isTransitioning) {
            // Unlock Web Speech API synchronously upon user gesture (crucial for iOS Safari)
            unlockSpeech();

            setIsTransitioning(true);
            // หน่วงเวลาเล็กน้อย (เช่น 0.8 วิ) 
            // - เพื่อให้เสียงเริ่มโหลดใน Background (Browser ได้รับ User Gesture แล้ว)
            // - เพื่อให้ UI มีเวลาทำอนิเมชั่นจางหายไปแบบสมูทๆ
            setTimeout(() => {
                completeSplash();
            }, 800);
        }
    };

    return (
        <AnimatePresence>
            {!isTransitioning && (
                <motion.div
                    className={`w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden ${isLoaded ? 'cursor-pointer' : 'cursor-wait'}`}
                    style={{ backgroundColor: '#000' }}
                    onClick={handleTap}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                    <div className="absolute inset-0 pointer-events-none opacity-20">
                        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
                            style={{ background: 'radial-gradient(circle, #eab308, transparent 70%)', filter: 'blur(80px)', transform: 'translate(-50%, -50%)' }} />
                        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full"
                            style={{ background: 'radial-gradient(circle, #eab308, transparent 70%)', filter: 'blur(80px)', transform: 'translate(50%, 50%)' }} />
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="flex flex-col items-center gap-8 z-10"
                    >
                        <div className="relative">
                            <motion.div
                                className="absolute inset-0 rounded-full bg-yellow-500/20 blur-3xl"
                                animate={{ opacity: [0.2, 0.5, 0.2] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <img src="/icon.png" alt="Pok Deng Icon" className="w-40 h-40 object-contain drop-shadow-[0_0_25px_rgba(234,179,8,0.4)] relative z-10" />
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8, duration: 0.8 }}
                            className="text-center"
                        >
                            <p className="text-yellow-500 font-bold text-3xl tracking-widest mb-3 drop-shadow-md">POK DENG</p>
                            <div className="flex items-center justify-center gap-2 text-white/50 text-xs tracking-[0.2em]">
                                <div className="w-8 h-[1px] bg-white/20"></div>
                                <p>SYSTEM DEVELOPER : WINTAPAS</p>
                                <div className="w-8 h-[1px] bg-white/20"></div>
                            </div>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        className="absolute bottom-16 w-full max-w-[200px] z-10 h-12 flex flex-col justify-end"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5, duration: 1 }}
                    >
                        {!isLoaded ? (
                            <>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-3">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-300 ease-out"
                                        style={{ width: `${loadProgress}%` }}
                                    />
                                </div>
                                <p className="text-center text-white/40 text-[10px] tracking-widest uppercase font-mono">
                                    Loading System... {loadProgress}%
                                </p>
                            </>
                        ) : (
                            <motion.div
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                className="text-center"
                            >
                                <p className="text-yellow-400 font-bold text-sm tracking-widest drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]">
                                    แตะหน้าจอเพื่อเริ่มเกม
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

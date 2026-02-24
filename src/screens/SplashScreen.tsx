import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { unlockSpeech } from '../utils/sound';

export default function SplashScreen() {
    const completeSplash = useGameStore(s => s.completeSplash);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // State สำหรับการโหลดหลอก (Text Animation)
    const [isFakeLoading, setIsFakeLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");

    // ไม่จำเป็นต้องเช็ค Pointer Events ตอนโหลดเสร็จแล้ว เพราะโชว์ปุ่มเลย
    useEffect(() => {
        const handleInteraction = () => {
            window.removeEventListener('pointerdown', handleInteraction);
        };
        window.addEventListener('pointerdown', handleInteraction);
        return () => window.removeEventListener('pointerdown', handleInteraction);
    }, []);

    const handleTap = () => {
        if (!isFakeLoading && !isTransitioning) {
            // Unlock Web Speech API synchronously upon user gesture (crucial for iOS Safari)
            unlockSpeech();

            // เริ่มเฟส: กำลังอ่านข้อมูลหลอกๆ (5 วินาที) เพื่อถ่วงเวลาให้ iOS Speech พร้อม
            setIsFakeLoading(true);

            const fakeTexts = [
                "กำลังยืนยันตัวตนเซิร์ฟเวอร์...",
                "กำลังอ่านข้อมูลทรัพยากร...",
                "เตรียมระบบเสียงและกราฟิก...",
                "กำลังจัดเรียงโต๊ะไพ่ป๊อกเด้ง...",
                "พร้อมเข้าสู่เกม!"
            ];

            let step = 0;
            setLoadingText(fakeTexts[0]);

            // เปลี่ยนข้อความทุกๆ 1 วินาที (รวม 5 วินาที)
            const textInterval = setInterval(() => {
                step++;
                if (step < fakeTexts.length) {
                    setLoadingText(fakeTexts[step]);
                }
            }, 1000);

            setTimeout(() => {
                clearInterval(textInterval);
                setIsTransitioning(true);
                // พอหลอกเสร็จ ค่อยเปลี่ยนหน้าในอีก 0.8 วิ (รอภาพเฟดเอาท์)
                setTimeout(() => {
                    completeSplash();
                }, 800);
            }, 5000);
        }
    };

    return (
        <AnimatePresence>
            {!isTransitioning && (
                <motion.div
                    className={`w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden ${!isFakeLoading ? 'cursor-pointer' : 'cursor-wait'}`}
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

                    <div className="flex flex-col items-center gap-8 z-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            className="relative"
                        >
                            <motion.div
                                className="absolute inset-0 rounded-full bg-yellow-500/20 blur-3xl"
                                animate={{ opacity: [0.2, 0.5, 0.2] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <img src="/icon.png" alt="Pok Deng Icon" className="w-40 h-40 object-contain drop-shadow-[0_0_25px_rgba(234,179,8,0.4)] relative z-10" />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.5, duration: 1 }}
                            className="text-center"
                        >
                            <p className="text-yellow-500 font-bold text-3xl tracking-widest mb-3 drop-shadow-md">POK DENG</p>
                            <div className="flex items-center justify-center gap-2 text-white/50 text-xs tracking-[0.2em]">
                                <div className="w-8 h-[1px] bg-white/20"></div>
                                <p>SYSTEM DEVELOPER : WINTAPAS</p>
                                <div className="w-8 h-[1px] bg-white/20"></div>
                            </div>
                        </motion.div>
                    </div>

                    <motion.div
                        className="absolute bottom-16 w-full max-w-[300px] z-10 h-12 flex flex-col justify-end items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.5, duration: 1 }}
                    >
                        {isFakeLoading ? (
                            // Fake Loading Text Animation (After Tap)
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={loadingText}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-center text-yellow-300/80 text-xs tracking-widest"
                                >
                                    {loadingText}
                                </motion.p>
                            </AnimatePresence>
                        ) : (
                            // "Tap to Continue" prompt shown immediately
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

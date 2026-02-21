import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Settings as SettingsIcon } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { loadSettings, saveSettings } from '../utils/storage';
import { SFX } from '../utils/sound';

export default function SettingsScreen() {
    const setScreen = useGameStore(s => s.setScreen);
    const settings = loadSettings();

    const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);

    const toggleSound = () => {
        const newVal = !soundEnabled;
        setSoundEnabled(newVal);
        saveSettings({ soundEnabled: newVal });
        if (newVal) SFX.click();
    };

    return (
        <div className="w-full h-full bg-casino-table flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto relative">
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />

            <div className="w-full max-w-sm relative z-10 flex justify-between items-center mb-6 mt-2">
                <button
                    onClick={() => setScreen('MENU')}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition cursor-pointer shadow-lg"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10" />
            </div>

            <motion.div
                className="w-full max-w-sm relative z-10"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <div className="bg-black/60 border border-yellow-500/20 shadow-2xl rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-3xl rounded-full" />

                    <div className="text-center mb-10 relative">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/40 border-2 border-yellow-500/30 shadow-[0_0_20px_rgba(250,204,21,0.15)] mb-4 relative">
                            <SettingsIcon size={36} className="text-yellow-400" />
                            <div className="absolute inset-0 rounded-full border border-yellow-400/20 animate-spin-slow" style={{ animationDuration: '4s' }} />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gold-gradient tracking-widest drop-shadow-md">
                            ตั้งค่า
                        </h2>
                    </div>

                    <div className="space-y-6">
                        {/* Sound Toggle */}
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 shadow-inner">
                            <label className="flex items-center gap-2.5 text-xs text-white/60 font-medium uppercase tracking-wider mb-3">
                                {soundEnabled
                                    ? <Volume2 size={16} className="text-emerald-400" />
                                    : <VolumeX size={16} className="text-red-400" />}
                                ระบบเสียงเกม
                            </label>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={toggleSound}
                                className={`w-full py-4 rounded-xl text-lg font-bold tracking-widest transition-all cursor-pointer border
                                    ${soundEnabled
                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                        : 'bg-black/50 text-white/40 border-white/10 hover:border-white/20'}`}
                            >
                                {soundEnabled ? 'เปิดเสียง' : 'ปิดเสียง'}
                            </motion.button>
                        </div>

                        {/* Additional Settings placeholders */}
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 shadow-inner opacity-50 grayscale pointer-events-none">
                            <label className="flex items-center gap-2.5 text-xs text-white/60 font-medium uppercase tracking-wider mb-3">
                                ภาษา (เร็วๆ นี้)
                            </label>
                            <div className="w-full py-3.5 rounded-xl border border-white/10 bg-white/5 text-center text-white/40 font-medium tracking-widest text-sm">
                                THAI (ภาษาไทย)
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-white/20 text-[10px] mt-8 tracking-widest uppercase">Version 0.0.1</p>
                </div>
            </motion.div>
        </div>
    );
}

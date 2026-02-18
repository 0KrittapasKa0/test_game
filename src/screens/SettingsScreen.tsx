import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
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
        <div className="w-full h-full page-bg flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
                className="glass w-full max-w-sm p-5 sm:p-7"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <button
                    onClick={() => setScreen('MENU')}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-white mb-4 transition cursor-pointer text-sm"
                >
                    <ArrowLeft size={18} />
                    กลับ
                </button>

                <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 text-center mb-6">
                    ⚙️ ตั้งค่า
                </h2>

                {/* Sound */}
                <div>
                    <label className="flex items-center gap-2 text-sm text-gray-400 font-medium mb-2.5">
                        {soundEnabled
                            ? <Volume2 size={18} className="text-green-400" />
                            : <VolumeX size={18} className="text-red-400" />}
                        เสียง
                    </label>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleSound}
                        className={`w-full py-3.5 rounded-2xl text-base font-semibold transition-all cursor-pointer
              ${soundEnabled
                                ? 'bg-gradient-to-r from-emerald-600 to-green-700 text-white shadow-lg shadow-green-600/20'
                                : 'bg-white/5 text-gray-400 border border-white/8'}`}
                    >
                        {soundEnabled ? '🔊 เปิดเสียง' : '🔇 ปิดเสียง'}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}

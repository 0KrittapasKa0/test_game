import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Settings as SettingsIcon, Mic, MicOff, Check, X } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { loadSettings, saveSettings } from '../utils/storage';
import { SFX } from '../utils/sound';

const ToggleSwitch = ({ enabled, onClick, activeColorClass }: { enabled: boolean; onClick: () => void; activeColorClass: string }) => (
    <div
        onClick={onClick}
        className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 border ${enabled
            ? `${activeColorClass} border-transparent bg-opacity-80`
            : 'bg-black/50 border-white/10'
            }`}
    >
        <motion.div
            initial={false}
            animate={{ x: enabled ? 24 : 0 }}
            className={`w-6 h-6 bg-white rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.5)] flex items-center justify-center`}
        >
            {enabled ? <Check size={14} className="text-black/70" /> : <X size={14} className="text-black/30" />}
        </motion.div>
    </div>
);

export default function SettingsScreen() {
    const setScreen = useGameStore(s => s.setScreen);
    const settings = loadSettings();

    const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
    const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled ?? true);

    const toggleSound = () => {
        const newVal = !soundEnabled;
        setSoundEnabled(newVal);
        saveSettings({ soundEnabled: newVal });
        if (newVal) SFX.click();
    };

    const toggleVoice = () => {
        const newVal = !voiceEnabled;
        setVoiceEnabled(newVal);
        saveSettings({ voiceEnabled: newVal });
        if (soundEnabled) SFX.click();
    };

    return (
        <div className="w-full h-full bg-casino-table flex items-center justify-center p-4 sm:p-6 overflow-y-auto relative">
            {/* Ambient Dark Vignette overlay */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10" />

            <motion.div
                className="w-full max-w-sm relative z-20"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <div className="bg-black/60 border border-yellow-500/20 shadow-2xl rounded-3xl p-5 sm:p-7 backdrop-blur-xl relative overflow-hidden">
                    {/* Top Glow Decor */}
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

                    {/* Back Button */}
                    <button
                        onClick={() => setScreen('MENU')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition cursor-pointer shadow-lg mb-4 absolute top-4 left-4 z-20"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    {/* Spacer for absolute button */}
                    <div className="h-4" />

                    <div className="mt-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gold-gradient text-center tracking-widest drop-shadow-md uppercase mb-1">
                            ตั้งค่า
                        </h2>

                        {/* Centered Decorative Subtitle */}
                        <div className="text-center mb-8 flex items-center justify-center gap-2">
                            <SettingsIcon size={14} className="text-yellow-500/70" />
                            <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Preferences</span>
                        </div>

                        {/* Settings Options */}
                        <div className="space-y-4">
                            {/* Sound Setting */}
                            <div className="relative group">
                                <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 rounded-2xl blur-xl ${soundEnabled ? 'group-hover:opacity-100' : ''}`} />
                                <div className="relative flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:bg-black/50 transition-colors shadow-inner">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${soundEnabled ? 'bg-gradient-to-br from-blue-400/20 to-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/30 border border-white/5'}`}>
                                            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-bold text-sm sm:text-base tracking-wider transition-colors ${soundEnabled ? 'text-white' : 'text-white/60'}`}>ระบบเสียงเกม</span>
                                            <span className="text-white/40 text-[10px] m-0 leading-none">เปิด/ปิด เอฟเฟกต์และดนตรี</span>
                                        </div>
                                    </div>
                                    <ToggleSwitch
                                        enabled={soundEnabled}
                                        onClick={toggleSound}
                                        activeColorClass="bg-gradient-to-b from-blue-400 to-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    />
                                </div>
                            </div>

                            {/* Voice Setting */}
                            <div className="relative group">
                                <div className={`absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 rounded-2xl blur-xl ${voiceEnabled ? 'group-hover:opacity-100' : ''}`} />
                                <div className="relative flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:bg-black/50 transition-colors shadow-inner">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${voiceEnabled ? 'bg-gradient-to-br from-pink-400/20 to-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-white/5 text-white/30 border border-white/5'}`}>
                                            {voiceEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-bold text-sm sm:text-base tracking-wider transition-colors ${voiceEnabled ? 'text-white' : 'text-white/60'}`}>เสียงพากย์บรรยาย</span>
                                            <span className="text-white/40 text-[10px] m-0 leading-none">เปิด/ปิด ดีลเลอร์และตอบรับ</span>
                                        </div>
                                    </div>
                                    <ToggleSwitch
                                        enabled={voiceEnabled}
                                        onClick={toggleVoice}
                                        activeColorClass="bg-gradient-to-b from-pink-400 to-pink-600 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                                    />
                                </div>
                            </div>
                        </div>

                        <p className="text-center text-white/20 text-[10px] mt-10 mb-2 tracking-widest uppercase font-bold">
                            Version 0.0.1
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
